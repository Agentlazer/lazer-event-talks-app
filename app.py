import os
import hashlib
import time
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Simple in-memory cache
CACHE = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECS = 300 # 5 minutes

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_content(content_html):
    soup = BeautifulSoup(content_html, 'html.parser')
    for a in soup.find_all('a'):
        a['target'] = '_blank'
        a['rel'] = 'noopener noreferrer'
    return str(soup)

def parse_feed_entries():
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        feed = feedparser.parse(response.text)
        
        parsed_notes = []
        
        for entry in feed.entries:
            date_str = entry.get('title', 'Unknown Date')
            entry_link = entry.get('link', '')
            
            content_val = ''
            if 'content' in entry:
                content_val = entry.content[0].value
            elif 'summary' in entry:
                content_val = entry.summary
                
            if not content_val:
                continue
                
            soup = BeautifulSoup(content_val, 'html.parser')
            current_category = "General"
            current_elements = []
            
            # Parse top-level elements inside the entry content HTML
            for element in soup.contents:
                name = getattr(element, 'name', None)
                if name == 'h3':
                    if current_elements:
                        note_item = create_note_item(date_str, entry_link, current_category, current_elements)
                        parsed_notes.append(note_item)
                        current_elements = []
                    current_category = element.get_text().strip()
                elif name is not None:
                    current_elements.append(element)
                elif isinstance(element, str) and element.strip():
                    current_elements.append(element)
            
            if current_elements:
                note_item = create_note_item(date_str, entry_link, current_category, current_elements)
                parsed_notes.append(note_item)
                
        return parsed_notes, None
    except Exception as e:
        return [], str(e)

def create_note_item(date_str, entry_link, category, elements):
    # Construct clean content HTML
    content_html = "".join(str(el) for el in elements).strip()
    content_html = clean_html_content(content_html)
    
    # Get plain text for tweeting
    text_soup = BeautifulSoup(content_html, 'html.parser')
    text_content = text_soup.get_text().strip()
    text_content = " ".join(text_content.split())
    
    # Generate unique ID based on date, category, and text content hash
    content_hash = hashlib.md5(text_content.encode('utf-8')).hexdigest()[:8]
    item_id = f"{date_str.lower().replace(' ', '_').replace(',', '')}_{category.lower()}_{content_hash}"
    
    # Format tweet text (with character limit in mind)
    # Header format: BigQuery [Category] (Date)
    header = f"Google BigQuery Update ({date_str}) | {category}:\n"
    # Max text limit: 280 (Twitter standard) - header_length - 23 (link length shortener) - 8 (spacing, quotes, etc.)
    max_text_len = 280 - len(header) - 23 - 8
    
    truncated_text = text_content
    if len(truncated_text) > max_text_len:
        truncated_text = truncated_text[:max_text_len-3] + "..."
        
    tweet_text = f"{header}\"{truncated_text}\"\n\nRead more: {entry_link}"
    
    return {
        "id": item_id,
        "date": date_str,
        "category": category,
        "content_html": content_html,
        "text_content": text_content,
        "tweet_text": tweet_text,
        "link": entry_link
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not CACHE["data"] or (now - CACHE["last_fetched"] > CACHE_DURATION_SECS):
        notes, err = parse_feed_entries()
        if err:
            if CACHE["data"]:
                return jsonify({
                    "notes": CACHE["data"],
                    "source": "cache_fallback",
                    "error": f"Failed to refresh: {err}. Using cached data.",
                    "last_fetched": CACHE["last_fetched"]
                })
            return jsonify({"notes": [], "error": err}), 500
            
        CACHE["data"] = notes
        CACHE["last_fetched"] = now
        
    return jsonify({
        "notes": CACHE["data"],
        "source": "live" if force_refresh or (now - CACHE["last_fetched"] < 5) else "cache",
        "last_fetched": CACHE["last_fetched"]
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
