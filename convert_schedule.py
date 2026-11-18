
import re
import json
import datetime
from pathlib import Path

def parse_schedule(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by days
    day_blocks = re.split(r'## 📅 Day (\d+):', content)
    
    tasks = []
    start_date = datetime.date(2026, 1, 16)
    
    # day_blocks[0] is header, then we have pairs of (day_num, content)
    for i in range(1, len(day_blocks), 2):
        day_num = int(day_blocks[i])
        day_content = day_blocks[i+1]
        
        current_date = start_date + datetime.timedelta(days=day_num - 1)
        date_str = current_date.isoformat()
        
        lines = day_content.strip().split('\n')
        for line in lines:
            line = line.strip()
            if not line.startswith('- [ ]'):
                continue
                
            match = re.search(r'\*\*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*\((\d+\.?\d*)h\)\*\*:\s*(.*)', line)
            
            if match:
                start_time = match.group(1)
                end_time = match.group(2)
                hours = float(match.group(3))
                rest = match.group(4)
                
                prefix_match = re.match(r'\*\*(.*?)\*\*:\s*(.*)', rest)
                if prefix_match:
                    name_prefix = f" [{prefix_match.group(1)}]"
                    description = prefix_match.group(2)
                    # Use a short name if possible, or just the description
                    # The example used " [TRANSLATOR] Module Structure"
                    # We'll use " [Prefix] Description" but maybe truncate if very long? No, full is better.
                    task_name = f"{name_prefix} {description.split('(')[0].strip() if '(' in description else description}" # Heuristic for shorter name
                    full_desc = description
                else:
                    task_name = f" [General] {rest.split('(')[0].strip()}"
                    full_desc = rest
                
                full_desc = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', full_desc)
                
                task_entry = {
                    "name": task_name,
                    "hours": hours,
                    "description": full_desc,
                    "date": date_str,
                    "start_time": start_time,
                    "end_time": end_time
                }
                tasks.append(task_entry)

    return tasks

if __name__ == "__main__":
    path = r"C:\Users\tovfi\.gemini\antigravity\brain\f115d8ac-b645-4205-a6a6-b063977c6cce\WORK_SCHEDULE.md"
    try:
        data = parse_schedule(path)
        with open('schedule.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print("Done")
    except Exception as e:
        print(f"Error: {e}")
