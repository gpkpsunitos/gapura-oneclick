import json
import os

source_file = '/Users/nrzngr/.gemini/antigravity/brain/dcacfdbc-31c6-4b83-b9c9-5f2fe57b3d1b/.system_generated/steps/117/output.txt'
output_dir = '/Users/nrzngr/Desktop/gapura-irrs2/supabase/export/data'

with open(source_file, 'r') as f:
    raw = f.read()
    data_wrapper = json.loads(raw)
    result_str = data_wrapper['result']
    
    # Simple extraction since the tags might vary, but let's try the same pattern
    import re
    match = re.search(r'<untrusted-data-.*?>(.*?)</untrusted-data-.*?>', result_str, re.DOTALL)
    if match:
        json_data_str = match.group(1).strip()
        auth_data = json.loads(json_data_str)[0]
        
        for table_name, records in auth_data.items():
            if records is None:
                records = []
            file_path = os.path.join(output_dir, f"{table_name}.json")
            with open(file_path, 'w') as out_f:
                json.dump(records, out_f, indent=2)
            print(f"Extracted {len(records)} records to {table_name}.json from auth schema")
    else:
        print("Could not find data in output.txt")

