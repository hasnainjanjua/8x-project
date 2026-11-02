#!/usr/bin/env python3
import sys
import os
import json
import threading
import subprocess
from datetime import datetime, timezone

def read_stdin_with_timeout(timeout=1.5):
    res = []
    def worker():
        try:
            res.append(sys.stdin.read())
        except Exception:
            pass
    t = threading.Thread(target=worker)
    t.daemon = True
    t.start()
    t.join(timeout=timeout)
    if res and res[0].strip():
        return res[0]
    return ""

def main():
    # 1. Output valid JSON {} to stdout immediately for Antigravity hook contract
    try:
        sys.stdout.write("{}\n")
        sys.stdout.flush()
    except Exception:
        pass

    # 2. Read stdin
    input_data = {}
    raw_input = read_stdin_with_timeout(timeout=1.0)
    if raw_input:
        try:
            input_data = json.loads(raw_input)
        except Exception:
            pass

    # 3. Debug logging
    script_dir = os.path.dirname(os.path.abspath(__file__))
    debug_log = os.path.join(script_dir, "hook_debug.log")
    try:
        with open(debug_log, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now(timezone.utc).isoformat()}] Hook triggered. Stdin: {json.dumps(input_data)}\n")
    except Exception:
        pass

    # 4. Determine conversationId
    conv_id = (
        input_data.get("conversationId")
        or os.environ.get("ANTIGRAVITY_CONVERSATION_ID")
        or ""
    )

    # 5. Determine workspacePath
    workspace_paths = input_data.get("workspacePaths") or []
    workspace_dir = None
    if workspace_paths and isinstance(workspace_paths, list):
        workspace_dir = workspace_paths[0]
    
    if not workspace_dir or not os.path.exists(workspace_dir):
        curr = script_dir
        while curr and os.path.dirname(curr) != curr:
            if os.path.exists(os.path.join(curr, ".git")):
                workspace_dir = curr
                break
            curr = os.path.dirname(curr)
        if not workspace_dir:
            workspace_dir = r"D:\MEGAPROJECT\8x-project"

    # 6. Determine transcriptPath
    transcript_path = input_data.get("transcriptPath")
    app_data_dir = os.environ.get("ANTIGRAVITY_APP_DATA_DIR", r"C:\Users\ahmed\.gemini\antigravity")

    if not transcript_path or not os.path.exists(transcript_path):
        if conv_id:
            cand = os.path.join(app_data_dir, "brain", conv_id, ".system_generated", "logs", "transcript_full.jsonl")
            if os.path.exists(cand):
                transcript_path = cand
            else:
                cand2 = os.path.join(app_data_dir, "brain", conv_id, ".system_generated", "logs", "transcript.jsonl")
                if os.path.exists(cand2):
                    transcript_path = cand2

    # Fallback: scan brain directory for most recently modified session
    if not transcript_path or not os.path.exists(transcript_path):
        brain_dir = os.path.join(app_data_dir, "brain")
        if os.path.exists(brain_dir):
            subdirs = [os.path.join(brain_dir, d) for d in os.listdir(brain_dir) if os.path.isdir(os.path.join(brain_dir, d))]
            subdirs.sort(key=os.path.getmtime, reverse=True)
            for d in subdirs:
                tf = os.path.join(d, ".system_generated", "logs", "transcript_full.jsonl")
                if os.path.exists(tf):
                    transcript_path = tf
                    if not conv_id:
                        conv_id = os.path.basename(d)
                    break

    # If transcript_path is transcript.jsonl, check if transcript_full.jsonl exists in same dir
    if transcript_path and transcript_path.endswith("transcript.jsonl"):
        full_cand = transcript_path.replace("transcript.jsonl", "transcript_full.jsonl")
        if os.path.exists(full_cand):
            transcript_path = full_cand

    if not transcript_path or not os.path.exists(transcript_path):
        return

    # Extract conv_id from transcript_path if still empty
    if not conv_id:
        norm = os.path.normpath(transcript_path)
        parts = norm.split(os.sep)
        if "brain" in parts:
            b_idx = parts.index("brain")
            if b_idx + 1 < len(parts):
                conv_id = parts[b_idx + 1]

    # Parse transcript
    steps = []
    try:
        with open(transcript_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    steps.append(json.loads(line))
    except Exception as e:
        return

    exchanges = []
    current_prompt = None

    for step in steps:
        stype = step.get("type")
        source = step.get("source")

        if source == "USER_EXPLICIT" and stype == "USER_INPUT":
            if current_prompt is not None and current_prompt.get("prompt_text"):
                exchanges.append(current_prompt)
            content = step.get("content", "")
            if "<USER_REQUEST>" in content:
                prompt_text = content.split("<USER_REQUEST>")[1].split("</USER_REQUEST>")[0].strip()
            else:
                prompt_text = content.strip()
            current_prompt = {
                "prompt_text": prompt_text,
                "prompt_time": step.get("created_at"),
                "response_text": None,
                "response_time": None
            }
        elif current_prompt is not None and source == "MODEL" and stype == "PLANNER_RESPONSE":
            if not step.get("tool_calls") and step.get("content"):
                current_prompt["response_text"] = step.get("content", "").strip()
                current_prompt["response_time"] = step.get("created_at")

    if current_prompt is not None and current_prompt.get("prompt_text"):
        exchanges.append(current_prompt)

    if not exchanges:
        return

    # Frontmatter metadata
    first_prompt_time = exchanges[0]["prompt_time"] or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    last_prompt_time = exchanges[-1]["prompt_time"] or first_prompt_time

    try:
        clean_ts = first_prompt_time.replace("Z", "").split(".")[0]
        dt = datetime.fromisoformat(clean_ts)
        time_prefix = dt.strftime("%Y-%m-%d_%H-%M-%S")
        date_str = dt.strftime("%Y-%m-%d")
    except Exception:
        time_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    short_session = conv_id[:8] if conv_id else "session"
    author = "hasnainjanjua"
    project = os.path.basename(workspace_dir) or "8x-project"
    model = "gemini-3.8-flash"
    tool = "antigravity"

    # File naming: YYYY-MM-DD_HH-MM-SS_<session-id>.md
    log_filename = f"{time_prefix}_{conv_id}.md"
    agent_logs_dir = os.path.join(workspace_dir, ".agent-logs")
    os.makedirs(agent_logs_dir, exist_ok=True)
    log_file_path = os.path.join(agent_logs_dir, log_filename)

    lines = []
    lines.append("---")
    lines.append(f"session_id: {conv_id}")
    lines.append(f"date: {date_str}")
    lines.append(f"author: {author}")
    lines.append(f"model: {model}")
    lines.append(f"tool: {tool}")
    lines.append(f"project: {project}")
    lines.append(f"total_exchanges: {len(exchanges)}")
    lines.append(f"first_prompt_time: {first_prompt_time}")
    lines.append(f"last_prompt_time: {last_prompt_time}")
    lines.append("---")
    lines.append("")
    lines.append(f"# Session Log - {date_str}")
    lines.append("")
    lines.append(f"Session: `{short_session}` | Project: `{project}` | Author: `{author}`")
    lines.append("")
    lines.append("---")
    lines.append("")

    for i, ex in enumerate(exchanges, 1):
        p_time = ex["prompt_time"] or ""
        lines.append(f"[LOG_ENTRY type=PROMPT num={i} session={short_session}]")
        lines.append(f"timestamp: {p_time}")
        lines.append(f"model: {model}")
        lines.append("")
        lines.append(ex["prompt_text"])
        lines.append("")
        lines.append("")

        r_text = ex["response_text"]
        if r_text is not None:
            r_time = ex["response_time"] or ""
            lines.append(f"[LOG_ENTRY type=RESPONSE num={i} session={short_session}]")
            lines.append(f"timestamp: {r_time}")
            lines.append(f"model: {model}")
            lines.append("")
            lines.append(r_text)
            lines.append("")
            lines.append("")

    content_str = "\n".join(lines).rstrip() + "\n"

    try:
        with open(log_file_path, "w", encoding="utf-8") as f:
            f.write(content_str)
    except Exception as e:
        pass

if __name__ == "__main__":
    main()
