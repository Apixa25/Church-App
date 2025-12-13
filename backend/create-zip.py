#!/usr/bin/env python3
"""
Create a ZIP file for AWS Elastic Beanstalk deployment.
Uses forward slashes for path separators (Linux-compatible).
"""

import zipfile
import os

def create_eb_zip(source_dir, output_zip):
    """Create a ZIP file with forward slashes."""
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                # Get relative path from source_dir
                arcname = os.path.relpath(file_path, source_dir)
                # Replace backslashes with forward slashes for Linux
                arcname = arcname.replace('\\', '/')
                print(f"  Adding: {arcname}")
                zf.write(file_path, arcname)
    
    print(f"\nCreated: {output_zip}")
    print(f"Size: {os.path.getsize(output_zip) / (1024*1024):.2f} MB")

if __name__ == "__main__":
    source = "deploy-bundle"
    output = "deploy-bundle-linux.zip"
    
    print(f"Creating ZIP from '{source}' to '{output}'...")
    print("Files:")
    create_eb_zip(source, output)

