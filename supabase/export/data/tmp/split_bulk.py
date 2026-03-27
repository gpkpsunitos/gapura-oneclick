import json
import os

source_file = '/Users/nrzngr/.gemini/antigravity/brain/dcacfdbc-31c6-4b83-b9c9-5f2fe57b3d1b/.system_generated/steps/96/output.txt'
output_dir = '/Users/nrzngr/Desktop/gapura-irrs2/supabase/export/data'

with open(source_file, 'r') as f:
    raw = f.read()
    # The output format is a JSON with a "result" field containing a string that has the actual data
    data_wrapper = json.loads(raw)
    result_str = data_wrapper['result']
    
    # Extract the JSON array from the Markdown-like wrapper if present
    start_tag = '<untrusted-data-1f27102b-eb53-4525-84f7-e73e2beabd3a>\n'
    end_tag = '\n<'
    
    start_idx = result_str.find(start_tag) + len(start_tag)
    end_idx = result_str.find(end_tag, start_idx)
    
    json_data_str = result_str[start_idx:end_idx]
    bulk_data = json.loads(json_data_str)[0] # It's an array with one object containing all columns
    
    for table_name, records in bulk_data.items():
        if records is None:
            records = []
        file_path = os.path.join(output_dir, f"{table_name}.json")
        with open(file_path, 'w') as out_f:
            json.dump(records, out_f, indent=2)
        print(f"Extracted {len(records)} records to {table_name}.json")

