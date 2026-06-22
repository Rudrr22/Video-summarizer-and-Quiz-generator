from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs


def get_transcript(video_url):
    try:
        # Extract video ID from URL
        parsed_url = urlparse(video_url)
        video_id = parse_qs(parsed_url.query)["v"][0]

        # Fetch transcript
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id)

        # Convert transcript into plain text
        full_text = " ".join(
            snippet.text
            for snippet in transcript
        )

        return full_text

    except Exception as e:
        raise Exception(
            f"Could not fetch transcript: {str(e)}"
        )