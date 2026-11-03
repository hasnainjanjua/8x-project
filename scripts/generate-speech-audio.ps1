Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Speech

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

$allVoices = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices

# Canonical, immutable Speaker-to-Voice Registry keyed strictly by stable speakerId.
# Voice selection NEVER depends on segment index, turn order, or participant array position.
$SpeakerVoiceRegistry = @{
    "spk-hasnain"  = @{ SpeakerName = "Hasnain Janjua"; Voice = "Microsoft David"; ExpectedGender = "Male";   Rate = "+6%"; Pitch = "0%"  }
    "spk-elena"    = @{ SpeakerName = "Elena Rostova";  Voice = "Microsoft Zira";  ExpectedGender = "Female"; Rate = "-5%"; Pitch = "+2%" }
    "spk-marcus"   = @{ SpeakerName = "Marcus Vance";   Voice = "Microsoft Mark";  ExpectedGender = "Male";   Rate = "-7%"; Pitch = "-4%" }
    "spk-claire"   = @{ SpeakerName = "Claire Moreau";  Voice = "Microsoft Zira";  ExpectedGender = "Female"; Rate = "-6%"; Pitch = "+3%" }
    "spk-devon"    = @{ SpeakerName = "Devon Brooks";   Voice = "Microsoft Mark";  ExpectedGender = "Male";   Rate = "-8%"; Pitch = "-3%" }
    "spk-sarah"    = @{ SpeakerName = "Sarah Jenkins";  Voice = "Microsoft Zira";  ExpectedGender = "Female"; Rate = "-5%"; Pitch = "+1%" }
    "spk-raj"      = @{ SpeakerName = "Raj Patel";      Voice = "Microsoft Mark";  ExpectedGender = "Male";   Rate = "-8%"; Pitch = "-2%" }
    "spk-liam"     = @{ SpeakerName = "Liam O'Connor";  Voice = "Microsoft Mark";  ExpectedGender = "Male";   Rate = "-7%"; Pitch = "-4%" }
    "spk-priya"    = @{ SpeakerName = "Priya Nair";     Voice = "Microsoft Zira";  ExpectedGender = "Female"; Rate = "-6%"; Pitch = "+2%" }
    "spk-prospect" = @{ SpeakerName = "Jordan Taylor";  Voice = "Microsoft Mark";  ExpectedGender = "Male";   Rate = "-6%"; Pitch = "-3%" }
}

function Get-ValidatedVoice($speakerId) {
    if ([string]::IsNullOrWhiteSpace($speakerId) -or -not $SpeakerVoiceRegistry.ContainsKey($speakerId)) {
        throw "CRITICAL VOICE MAPPING ERROR: Unknown or unmapped speakerId '$speakerId'. Refusing to fall back."
    }
    $entry = $SpeakerVoiceRegistry[$speakerId]
    $voiceObj = ($allVoices | Where-Object { $_.DisplayName -eq $entry.Voice })[0]
    if ($null -eq $voiceObj) {
        throw "CRITICAL TTS ERROR: Installed WinRT voice '$($entry.Voice)' not found for speakerId '$speakerId'."
    }
    if ($voiceObj.Gender.ToString() -ne $entry.ExpectedGender) {
        throw "CRITICAL GENDER MISMATCH: Voice '$($entry.Voice)' has gender '$($voiceObj.Gender)' but expected '$($entry.ExpectedGender)' for '$speakerId'."
    }
    return @{
        Profile  = $entry
        VoiceObj = $voiceObj
    }
}

# Extracts raw 16kHz 16-bit mono PCM bytes from a fresh per-utterance WinRT SpeechSynthesizer
function Synthesize-TurnPcm($speakerId, $ssmlBody) {
    $resolved = Get-ValidatedVoice $speakerId
    $profile = $resolved.Profile
    $voiceObj = $resolved.VoiceObj

    $synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
    $synth.Voice = $voiceObj

    $voiceName = $profile.Voice
    $rate = $profile.Rate
    $pitch = $profile.Pitch

    $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='$voiceName'><prosody rate='$rate' pitch='$pitch'>$ssmlBody</prosody></voice></speak>"
    $stream = Await ($synth.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
    $size = [uint32]$stream.Size
    $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
    $null = Await ($reader.LoadAsync($size)) ([uint32])
    $bytes = New-Object byte[] $size
    $reader.ReadBytes($bytes)
    $reader.Dispose()
    $stream.Dispose()

    # Locate 'data' chunk in WAV
    $pos = 12
    while ($pos -lt ($bytes.Length - 8)) {
        $chunkId = [System.Text.Encoding]::ASCII.GetString($bytes, $pos, 4)
        $chunkSize = [BitConverter]::ToUInt32($bytes, $pos + 4)
        if ($chunkId -eq 'data') {
            $dataStart = $pos + 8
            $actualLen = [Math]::Min([int]$chunkSize, $bytes.Length - $dataStart)
            $pcm = New-Object byte[] $actualLen
            [Array]::Copy($bytes, $dataStart, $pcm, 0, $actualLen)
            return ,$pcm
        }
        $pos += 8 + $chunkSize
    }
    throw "No data chunk found in synthesized stream for speakerId '$speakerId'"
}

function Write-MeetingWav($meetingId, $outPath, $totalDurationSec, $participantIds, $segments) {
    $sampleRate = 16000
    $bytesPerSec = $sampleRate * 2
    $totalDataBytes = $totalDurationSec * $bytesPerSec
    $fullPcm = New-Object byte[] $totalDataBytes

    foreach ($seg in $segments) {
        if ([string]::IsNullOrWhiteSpace($seg.SpeakerId)) {
            throw "Segment '$($seg.Id)' in meeting '$meetingId' is missing SpeakerId."
        }
        if ($participantIds -notcontains $seg.SpeakerId) {
            throw "Segment '$($seg.Id)' SpeakerId '$($seg.SpeakerId)' is not in meeting '$meetingId' participant list ($($participantIds -join ', '))."
        }

        $profile = $SpeakerVoiceRegistry[$seg.SpeakerId]
        $pcm = Synthesize-TurnPcm $seg.SpeakerId $seg.Text
        $startByte = [int]($seg.StartSec * $bytesPerSec)
        if (($startByte % 2) -ne 0) { $startByte-- }
        $maxBytes = ($seg.EndSec - $seg.StartSec) * $bytesPerSec
        $spokenSec = [Math]::Round($pcm.Length / 32000.0, 2)
        $slotSec = $seg.EndSec - $seg.StartSec

        if ($pcm.Length -gt $maxBytes) {
            throw "Segment '$($seg.Id)' in '$meetingId' overflowed slot (${spokenSec}s > ${slotSec}s)."
        }

        $copyLen = [Math]::Min($pcm.Length, [Math]::Min($maxBytes, $totalDataBytes - $startByte))
        if ($copyLen -gt 0 -and $startByte -lt $totalDataBytes) {
            [Array]::Copy($pcm, 0, $fullPcm, $startByte, $copyLen)
        }
        Write-Output "  -> [$($seg.Id)] [$($seg.StartSec)s..$($seg.EndSec)s] $($seg.SpeakerId) ($($profile.SpeakerName) -> $($profile.Voice), $($profile.ExpectedGender)): synthesized ${spokenSec}s / ${slotSec}s slot"
    }

    $fs = [System.IO.File]::Create($outPath)
    $bw = New-Object System.IO.BinaryWriter($fs)
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("RIFF"))
    $bw.Write([uint32](36 + $totalDataBytes))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("WAVE"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("fmt "))
    $bw.Write([uint32]16)
    $bw.Write([uint16]1)      # PCM
    $bw.Write([uint16]1)      # Mono
    $bw.Write([uint32]$sampleRate)
    $bw.Write([uint32]$bytesPerSec)
    $bw.Write([uint16]2)      # BlockAlign
    $bw.Write([uint16]16)     # 16-bit
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("data"))
    $bw.Write([uint32]$totalDataBytes)
    $bw.Write($fullPcm)
    $bw.Close()
    $fs.Close()
    Write-Output "Saved $outPath ($totalDurationSec sec, $([Math]::Round((36 + 8 + $totalDataBytes)/1024.0, 1)) KB)`n"
}

$mediaDir = Join-Path (Get-Location) "public\media"
if (-not (Test-Path $mediaDir)) { New-Item -ItemType Directory -Path $mediaDir | Out-Null }

# 1. Meeting 1: Acme Corp — Enterprise Discovery & MEDDPICC Qualification (150s)
Write-Output "Generating meeting-acme-discovery.wav (mtg-acme-discovery)..."
$m1Participants = @("spk-hasnain", "spk-elena", "spk-marcus")
$m1 = @(
    @{
        Id = "m1-t1"; SpeakerId = "spk-hasnain"; StartSec = 0; EndSec = 18
        Text = "Thanks for joining today, Elena and Marcus. <break time='150ms'/> Our main goal for this discovery session is understanding how Acme Corp's sixty-five person revenue and product organization currently captures customer calls, <break time='150ms'/> and where insights are getting lost between Zoom, HubSpot, and Linear."
    },
    @{
        Id = "m1-t2"; SpeakerId = "spk-elena"; StartSec = 19; EndSec = 46
        Text = "Appreciate you setting this up, Hasnain. <break time='300ms'/> Honestly, our biggest pain point right now is post-call admin drag. <break time='350ms'/> Each Account Executive spends twenty-two minutes after every discovery call typing notes into HubSpot. <break time='350ms'/> And even then, our product team never hears the raw voice of the customer when pricing or security objections come up."
    },
    @{
        Id = "m1-t3"; SpeakerId = "spk-hasnain"; StartSec = 47; EndSec = 74
        Text = "That twenty-two minute gap is exactly what we eliminate. <break time='300ms'/> With Fathom, the moment your call ends, we generate a structured MEDDPICC summary with clickable timestamps, <break time='250ms'/> extract every action item by owner, <break time='200ms'/> and sync the fields straight into your HubSpot deal stage automatically."
    },
    @{
        Id = "m1-t4"; SpeakerId = "spk-marcus"; StartSec = 75; EndSec = 108
        Text = "From an I.T. and InfoSec standpoint, <break time='300ms'/> two things are non-negotiable for our Q4 rollout. <break time='350ms'/> First, SOC 2 Type 2 compliance with zero training on our proprietary customer audio. <break time='350ms'/> And second, the ability to share thirty-second highlight clips externally with prospects without forcing them to create an account."
    },
    @{
        Id = "m1-t5"; SpeakerId = "spk-elena"; StartSec = 109; EndSec = 132
        Text = "Exactly. <break time='250ms'/> If we can validate the HubSpot bi-directional sync in a fifteen-seat pilot by next Thursday, and pass Marcus's SOC 2 review, <break time='300ms'/> we have eighty-four thousand dollars in approved Q4 budget ready to deploy across all sixty-five reps before November twentieth."
    },
    @{
        Id = "m1-t6"; SpeakerId = "spk-hasnain"; StartSec = 133; EndSec = 150
        Text = "Perfect alignment. <break time='180ms'/> I will send over our SOC 2 Type 2 security packet and D.P.A. to Marcus today, <break time='180ms'/> configure the fifteen-seat HubSpot sandbox for Elena by Tuesday, and schedule our pilot review for next Thursday at ten A.M. Eastern."
    }
)
Write-MeetingWav "mtg-acme-discovery" (Join-Path $mediaDir "meeting-acme-discovery.wav") 150 $m1Participants $m1

# 2. Meeting 2: Q4 Product & UX Review — AI Summary Templates & Clip Studio (120s)
Write-Output "Generating meeting-product-design.wav (mtg-linear-product)..."
$m2Participants = @("spk-hasnain", "spk-claire", "spk-devon")
$m2 = @(
    @{
        Id = "m2-t1"; SpeakerId = "spk-claire"; StartSec = 0; EndSec = 24
        Text = "Let's dive into the Q4 AI Summary Template and Clip Sharing UX review. <break time='350ms'/> We interviewed eighteen power users this week, <break time='300ms'/> and the number one workflow request was being able to switch between General, MEDDPICC, and User Research templates without losing custom highlights."
    },
    @{
        Id = "m2-t2"; SpeakerId = "spk-hasnain"; StartSec = 25; EndSec = 52
        Text = "Agreed, Claire. <break time='300ms'/> I profiled the state transitions yesterday. <break time='300ms'/> By pre-indexing transcript timestamps against each template framework, switching from General Summary to MEDDPICC or User Research happens in under fifteen milliseconds with zero page reload."
    },
    @{
        Id = "m2-t3"; SpeakerId = "spk-devon"; StartSec = 53; EndSec = 85
        Text = "One critical detail on the recording player: <break time='400ms'/> when someone clicks a timestamp badge inside the AI Summary, or clicks any line in the transcript, <break time='350ms'/> the audio player must immediately seek to that exact second and highlight the active speaker block in real time."
    },
    @{
        Id = "m2-t4"; SpeakerId = "spk-hasnain"; StartSec = 86; EndSec = 120
        Text = "One hundred percent. <break time='300ms'/> We've wired bidirectional synchronization between the HTML5 media element, the timeline chapter scrubber, and the transcript scroll container. <break time='300ms'/> I'll finalize the public logged-out share view today so external stakeholders can play clips without signing in."
    }
)
Write-MeetingWav "mtg-linear-product" (Join-Path $mediaDir "meeting-product-design.wav") 120 $m2Participants $m2

# 3. Meeting 3: FinScale Global — Q3 Customer Success QBR & 25-Seat Expansion (135s)
Write-Output "Generating meeting-stripe-qbr.wav (mtg-stripe-qbr)..."
$m3Participants = @("spk-hasnain", "spk-sarah", "spk-raj")
$m3 = @(
    @{
        Id = "m3-t1"; SpeakerId = "spk-sarah"; StartSec = 0; EndSec = 22
        Text = "Thanks for hosting our Q3 Executive Business Review. <break time='300ms'/> Over the past ninety days, our Customer Success and Solutions teams recorded four hundred and twelve client onboarding calls with Fathom, <break time='250ms'/> cutting weekly recap preparation time from four hours per C.S.M. down to fifteen minutes."
    },
    @{
        Id = "m3-t2"; SpeakerId = "spk-hasnain"; StartSec = 23; EndSec = 54
        Text = "Those adoption metrics are phenomenal, Sarah. <break time='300ms'/> Ninety-four percent active seat utilization across your forty C.S.M.s. <break time='300ms'/> Looking at your Q4 expansion roadmap, how can we make the handoff between Sales Discovery calls and Customer Success Onboarding even smoother?"
    },
    @{
        Id = "m3-t3"; SpeakerId = "spk-raj"; StartSec = 55; EndSec = 88
        Text = "The game-changer for my Solutions Architects is playlist clips. <break time='400ms'/> Instead of asking an engineer to watch a fifty-five minute discovery call, our Account Executives send a forty-second highlight clip of the customer explaining their A.P.I. topology. <break time='400ms'/> We want to add twenty-five Solutions Engineering seats next month."
    },
    @{
        Id = "m3-t4"; SpeakerId = "spk-hasnain"; StartSec = 89; EndSec = 115
        Text = "We can provision those twenty-five Solutions Engineering seats today, Raj, <break time='300ms'/> and enable your custom Q.B.R. and Technical Handoff summary templates across the entire FinScale workspace."
    },
    @{
        Id = "m3-t5"; SpeakerId = "spk-sarah"; StartSec = 116; EndSec = 135
        Text = "Awesome. <break time='250ms'/> Send over the updated order form for the twenty-five additional seats by Friday, <break time='250ms'/> and let's turn on the automated Slack clip alerts for our customer-voice channel."
    }
)
Write-MeetingWav "mtg-stripe-qbr" (Join-Path $mediaDir "meeting-stripe-qbr.wav") 135 $m3Participants $m3

# 4. Meeting 4: Audio ML & Diarization Pipeline — Sprint Architecture Sync (105s)
Write-Output "Generating meeting-eng-standup.wav (mtg-eng-architecture)..."
$m4Participants = @("spk-hasnain", "spk-liam", "spk-priya")
$m4 = @(
    @{
        Id = "m4-t1"; SpeakerId = "spk-hasnain"; StartSec = 0; EndSec = 20
        Text = "Quick engineering standup on the real-time transcription pipeline and speaker diarization latency. <break time='250ms'/> How did the multi-participant benchmark perform on sixty-minute calls with six or more speakers?"
    },
    @{
        Id = "m4-t2"; SpeakerId = "spk-liam"; StartSec = 21; EndSec = 48
        Text = "Word error rate dropped to three point one percent after enabling acoustic echo cancellation and per-channel speaker diarization. <break time='400ms'/> Even when two participants overlap during technical debates, speaker attribution stays locked above ninety-seven percent accuracy."
    },
    @{
        Id = "m4-t3"; SpeakerId = "spk-priya"; StartSec = 49; EndSec = 78
        Text = "On the storage and search side, <break time='300ms'/> full-text indexing across meeting titles, speaker names, summaries, and transcript utterances now returns ranked snippets in under twenty-five milliseconds. <break time='350ms'/> I also added speaker filter chips so users can isolate any participant's lines."
    },
    @{
        Id = "m4-t4"; SpeakerId = "spk-hasnain"; StartSec = 79; EndSec = 105
        Text = "Great progress, team. <break time='300ms'/> Let's ship the speaker talk-time distribution bar and monologue detection metrics to production this afternoon, <break time='250ms'/> and verify all public share links in a clean browser session."
    }
)
Write-MeetingWav "mtg-eng-architecture" (Join-Path $mediaDir "meeting-eng-standup.wav") 105 $m4Participants $m4

# 5. Meeting 5: Simulated Live Call Capture — CloudNova Enterprise Architecture (100s)
Write-Output "Generating meeting-cloudnova-sim.wav (mtg-sim-*)..."
$mSimParticipants = @("spk-hasnain", "spk-prospect")
$mSim = @(
    @{
        Id = "sim-t1"; SpeakerId = "spk-hasnain"; StartSec = 0; EndSec = 25
        Text = "Welcome to our live technical evaluation session, Jordan. <break time='250ms'/> How is your engineering team at CloudNova currently handling post-call architecture notes and action item handoffs?"
    },
    @{
        Id = "sim-t2"; SpeakerId = "spk-prospect"; StartSec = 25; EndSec = 50
        Text = "Our primary requirement is capturing key architectural decisions and customer commitments without distracting engineers during high-stakes calls."
    },
    @{
        Id = "sim-t3"; SpeakerId = "spk-hasnain"; StartSec = 50; EndSec = 75
        Text = "Anytime a stakeholder states a requirement or objection, <break time='250ms'/> you click a one-click Highlight button in the Fathom bar and it timestamps the exact segment."
    },
    @{
        Id = "sim-t4"; SpeakerId = "spk-prospect"; StartSec = 75; EndSec = 100
        Text = "That solves our sprint handoff bottleneck. <break time='300ms'/> Can we move forward with a thirty-seat engineering trial starting Monday and sync action items to Linear?"
    }
)
Write-MeetingWav "mtg-sim-cloudnova" (Join-Path $mediaDir "meeting-cloudnova-sim.wav") 100 $mSimParticipants $mSim
