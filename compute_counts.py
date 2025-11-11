import math
from pathlib import Path
here = Path(__file__).resolve().parent
text_path = here / 'final_message_content.txt'
text = text_path.read_text(encoding='utf-8')
while '<<CHAR_COUNT>>' in text or '<<TOKEN_COUNT>>' in text:
    char_count = len(text)
    token_count = math.ceil(char_count / 4)
    text = text.replace('<<CHAR_COUNT>>', str(char_count)).replace('<<TOKEN_COUNT>>', str(token_count))
ready_path = here / 'final_message_ready.txt'
ready_path.write_text(text, encoding='utf-8')
print(f"CHAR_COUNT={len(text)}")
print(f"TOKEN_EST={math.ceil(len(text)/4)}")
