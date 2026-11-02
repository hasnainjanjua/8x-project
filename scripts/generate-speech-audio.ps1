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

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$allVoices = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices

function Get-Voice($displayName) {
    return ($allVoices | Where-Object { $_.DisplayName -eq $displayName })[0]
}

# Extracts raw 16kHz 16-bit mono PCM bytes from a WinRT WAV stream
function Synthesize-TurnPcm($voiceName, $rate, $pitch, $ssmlBody) {
    $voiceObj = Get-Voice $voiceName
    $synth.Voice = $voiceObj
    $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><prosody rate='$rate' pitch='$pitch'>$ssmlBody</prosody></speak>"
    $stream = Await ($synth.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
    $size = [uint32]$stream.Size
    $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
    $null = Await ($reader.LoadAsync($size)) ([uint32])
    $bytes = New-Object byte[] $size
    $reader.ReadBytes($bytes)

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
    throw "No data chunk found in synthesized stream"
}

function Write-MeetingWav($outPath, $totalDurationSec, $segments) {
    $sampleRate = 16000
    $bytesPerSec = $sampleRate * 2
    $totalDataBytes = $totalDurationSec * $bytesPerSec
    $fullPcm = New-Object byte[] $totalDataBytes

    foreach ($seg in $segments) {
        $pcm = Synthesize-TurnPcm $seg.Voice $seg.Rate $seg.Pitch $seg.Text
        $startByte = [int]($seg.StartSec * $bytesPerSec)
        if (($startByte % 2) -ne 0) { $startByte-- }
        $maxBytes = ($seg.EndSec - $seg.StartSec) * $bytesPerSec
        $copyLen = [Math]::Min($pcm.Length, [Math]::Min($maxBytes, $totalDataBytes - $startByte))
        if ($copyLen -gt 0 -and $startByte -lt $totalDataBytes) {
            [Array]::Copy($pcm, 0, $fullPcm, $startByte, $copyLen)
        }
        $spokenSec = [Math]::Round($pcm.Length / 32000.0, 1)
        Write-Output "  -> Segment [$($seg.StartSec)s - $($seg.EndSec)s] ($($seg.Speaker) / $($seg.Voice)): synthesized ${spokenSec}s of speech"
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
    Write-Output "Saved $outPath ($totalDurationSec sec, $([Math]::Round((36 + 8 + $totalDataBytes)/1024.0, 1)) KB)"
}

$mediaDir = Join-Path (Get-Location) "public\media"
if (-not (Test-Path $mediaDir)) { New-Item -ItemType Directory -Path $mediaDir | Out-Null }

# 1. Meeting 1: Acme Corp — Enterprise Discovery & MEDDPICC Qualification (150s)
Write-Output "Generating meeting-acme-discovery.wav..."
$m1 = @(
    @{
        Speaker = "Hasnain Janjua"; Voice = "Microsoft David"; Rate = "+8%"; Pitch = "0%"
        StartSec = 0; EndSec = 18
        Text = "Thanks for joining today, Elena and Marcus. <break time='250ms'/> Our main goal for this discovery session is understanding how Acme Corp's sixty-five person revenue and product organization currently captures customer calls, <break time='200ms'/> and where insights are getting lost between Zoom, HubSpot, and Linear."
    },
    @{
        Speaker = "Elena Rostova"; Voice = "Microsoft Zira"; Rate = "-6%"; Pitch = "+2%"
        StartSec = 19; EndSec = 46
        Text = "Appreciate you setting this up, Hasnain. <break time='350ms'/> Honestly, our biggest pain point right now is post-call admin drag. <break time='400ms'/> Each Account Executive spends twenty-two minutes after every discovery call typing notes into HubSpot. <break time='400ms'/> And even then, our product team never hears the raw voice of the customer when pricing or security objections come up."
    },
    @{
        Speaker = "Hasnain Janjua"; Voice = "Microsoft David"; Rate = "-6%"; Pitch = "0%"
        StartSec = 47; EndSec = 74
        Text = "That twenty-two minute gap is exactly what we eliminate. <break time='400ms'/> With Fathom, the moment your call ends, we generate a structured MEDDPICC summary with clickable timestamps, <break time='300ms'/> extract every action item by owner, <break time='250ms'/> and sync the fields straight into your HubSpot deal stage automatically."
    },
    @{
        Speaker = "Marcus Vance"; Voice = "Microsoft Mark"; Rate = "-8%"; Pitch = "-4%"
        StartSec = 75; EndSec = 108
        Text = "From an I.T. and InfoSec standpoint, <break time='300ms'/> two things are non-negotiable for our Q4 rollout. <break time='400ms'/> First, SOC 2 Type 2 compliance with zero training on our proprietary customer audio. <break time='400ms'/> And second, the ability to share thirty-second highlight clips externally with prospects without forcing them to create an account."
    },
    @{
        Speaker = "Elena Rostova"; Voice = "Microsoft Zira"; Rate = "-6%"; Pitch = "+2%"
        StartSec = 109; EndSec = 132
        Text = "Exactly. <break time='300ms'/> If we can validate the HubSpot bi-directional sync in a fifteen-seat pilot by next Thursday, and pass Marcus's SOC 2 review, <break time='350ms'/> we have eighty-four thousand dollars in approved Q4 budget ready to deploy across all sixty-five reps before November twentieth."
    },
    @{
        Speaker = "Hasnain Janjua"; Voice = "Microsoft David"; Rate = "+8%"; Pitch = "0%"
        StartSec = 133; EndSec = 150
        Text = "Perfect alignment. <break time='200ms'/> I will send over our SOC 2 Type 2 security packet and D.P.A. to Marcus today, <break time='200ms'/> configure the fifteen-seat HubSpot sandbox for Elena by Tuesday, and schedule our pilot review for next Thursday at ten A.M. Eastern."
    }
)
Write-MeetingWav (Join-Path $mediaDir "meeting-acme-discovery.wav") 150 $m1

# 2. Meeting 2: Q4 Product & UX Review — AI Summary Templates & Clip Studio (120s)
Write-Output "Generating meeting-product-design.wav..."
$m2 = @(
    @{
        Speaker = "Claire Moreau"; Voice = "Microsoft Zira"; Rate = "-8%"; Pitch = "+3%"
        StartSec = 0; EndSec = 24
        Text = "Let's dive into the Q4 AI Summary Template and Clip Sharing UX review. <break time='400ms'/> We interviewed eighteen power users this week, <break time='350ms'/> and the number one workflow request was being able to switch between General, MEDDPICC, and User Research templates without losing custom highlights."
    },
    @{
        Speaker = "Hasnain Janjua"; Voice = "Microsoft David"; Rate = "-8%"; Pitch = "0%"
        StartSec = 25; EndSec = 52
        Text = "Agreed, Claire. <break time='400ms'/> I profiled the state transitions yesterday. <break time='400ms'/> By pre-indexing transcript timestamps against each template framework, switching from General Summary to MEDDPICC or User Research happens in under fifteen milliseconds with zero page reload."
    },
    @{
        Speaker = "Devon Brooks"; Voice = "Microsoft Mark"; Rate = "-10%"; Pitch = "-3%"
        StartSec = 53; EndSec = 85
        Text = "One critical detail on the recording player: <break time='450ms'/> when someone clicks a timestamp badge inside the AI Summary, or clicks any line in the transcript, <break time='400ms'/> the audio player must immediately seek to that exact second and highlight the active speaker block in real time."
    },
    @{
        Speaker = "Hasnain Janjua"; Voice = "Microsoft David"; Rate = "-8%"; Pitch = "0%"
        StartSec = 86; EndSec = 120
        Text = "One hundred percent. <break time='450ms'/> We've wired bidirectional synchronization between the HTML5 media element, the timeline chapter scrubber, and the transcript scroll container. <break time='450ms'/> I'll finalize the public logged-out share view today so external stakeholders can play clips without signing in."
    }
)
Write-MeetingWav (Join-Path $mediaDir "meeting-product-design.wav") 120 $m2

# 3. Meeting 3: FinScale Global — Q3 Customer Success QBR & 25-Seat Expansion (135s)
Write-Output "Generating meeting-stripe-qbr.wav..."
$m3 = @(
    @{
        Speaker = "Sarah Jenkins"; Voice = "Microsoft Zira"; Rate = "-6%"; Pitch = "+1%"
        StartSec = 0; EndSec = 22
        Text = "Thanks for hosting our Q3 Executive Business Review. <break time='350ms'/> Over the past ninety days, our Customer Success and Solutions teams recorded four hundred and twelve client onboarding calls with Fathom, <break time='300ms'/> cutting weekly recap preparation time from four hours per C.S.M. down to fifteen minutes."
    },
    @{
        Speaker = "Hasnain Janjua"; Voice = "Microsoft David"; Rate = "-8%"; Pitch = "0%"
        StartSec = 23; EndSec = 54
        Text = "Those adoption metrics are phenomenal, Sarah. <break time='400ms'/> Ninety-four percent active seat utilization across your forty C.S.M.s. <break time='450ms'/> Looking at your Q4 expansion roadmap, how can we make the handoff between Sales Discovery calls and Customer Success Onboarding even smoother?"
    },
    @{
        Speaker = "Raj Patel"; Voice = "Microsoft Mark"; Rate = "-10%"; Pitch = "-2%"
        StartSec = 55; EndSec = 88
        Text = "The game-changer for my Solutions Architects is playlist clips. <break time='450ms'/> Instead of asking an engineer to watch a fifty-five minute discovery call, our Account Executives send a forty-second highlight clip of the customer explaining their A.P.I. topology. <break time='450ms'/> We want to add twenty-five Solutions Engineering seats next month."
    },
    @{
        Speaker = "Hasnain Janjua"; Voice = "Microsoft David"; Rate = "-8%"; Pitch = "0%"
        StartSec = 89; EndSec = 115
        Text = "We can provision those twenty-five Solutions Engineering seats today, Raj, <break time='400ms'/> and enable your custom Q.B.R. and Technical Handoff summary templates across the entire FinScale workspace."
    },
    @{
        Speaker = "Sarah Jenkins"; Voice = "Microsoft Zira"; Rate = "-6%"; Pitch = "+1%"
        StartSec = 116; EndSec = 135
        Text = "Awesome. <break time='300ms'/> Send over the updated order form for the twenty-five additional seats by Friday, <break time='300ms'/> and let's turn on the automated Slack clip alerts for our customer-voice channel."
    }
)
Write-MeetingWav (Join-Path $mediaDir "meeting-stripe-qbr.wav") 135 $m3

# 4. Meeting 4: Audio ML & Diarization Pipeline — Sprint Architecture Sync (105s)
Write-Output "Generating meeting-eng-standup.wav..."
$m4 = @(
    @{
        Speaker = "Hasnain Janjua"; Voice = "Microsoft David"; Rate = "-6%"; Pitch = "0%"
        StartSec = 0; EndSec = 20
        Text = "Quick engineering standup on the real-time transcription pipeline and speaker diarization latency. <break time='350ms'/> How did the multi-participant benchmark perform on sixty-minute calls with six or more speakers?"
    },
    @{
        Speaker = "Liam O'Connor"; Voice = "Microsoft Mark"; Rate = "-8%"; Pitch = "-4%"
        StartSec = 21; EndSec = 48
        Text = "Word error rate dropped to three point one percent after enabling acoustic echo cancellation and per-channel speaker diarization. <break time='450ms'/> Even when two participants overlap during technical debates, speaker attribution stays locked above ninety-seven percent accuracy."
    },
    @{
        Speaker = "Priya Nair"; Voice = "Microsoft Zira"; Rate = "-8%"; Pitch = "+2%"
        StartSec = 49; EndSec = 78
        Text = "On the storage and search side, <break time='350ms'/> full-text indexing across meeting titles, speaker names, summaries, and transcript utterances now returns ranked snippets in under twenty-five milliseconds. <break time='400ms'/> I also added speaker filter chips so users can isolate any participant's lines."
    },
    @{
        Speaker = "Hasnain Janjua"; Voice = "Microsoft David"; Rate = "-8%"; Pitch = "0%"
        StartSec = 79; EndSec = 105
        Text = "Great progress, team. <break time='400ms'/> Let's ship the speaker talk-time distribution bar and monologue detection metrics to production this afternoon, <break time='350ms'/> and verify all public share links in a clean browser session."
    }
)
Write-MeetingWav (Join-Path $mediaDir "meeting-eng-standup.wav") 105 $m4
