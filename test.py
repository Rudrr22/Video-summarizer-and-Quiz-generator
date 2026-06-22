from utils.youtube import get_transcript

url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

text = get_transcript(url)

print(text[:1000])