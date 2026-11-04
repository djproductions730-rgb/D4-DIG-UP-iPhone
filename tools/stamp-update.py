"""Build update metadata and versioned shell URLs from the actual DIG UP history."""
import ast
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def source_revision(root):
    patterns = [':(top,glob)*.html', ':(top,glob)*.js', ':(top,glob)*.css',
                'assets', 'tools/stamp-update.py', '.github/workflows/pages.yml']
    return int(subprocess.check_output(['git', 'rev-list', '--count', 'HEAD', '--', *patterns], cwd=root, text=True).strip())


def asset_url(value, build):
    url = urlsplit(value)
    if url.scheme or url.netloc or not url.path.endswith(('.js', '.css')):
        return value
    query = [(key, val) for key, val in parse_qsl(url.query) if key != 'd4build']
    query.append(('d4build', build))
    return urlunsplit((url.scheme, url.netloc, url.path, urlencode(query), url.fragment))


def stamp(root, revision=None, head=None):
    root = Path(root)
    revision = source_revision(root) if revision is None else revision
    head = head or subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    build = str(revision) + '-' + head[:12]
    page = root / 'index.html'
    text = page.read_text()
    for name, value in [('d4-app-revision', str(revision)), ('d4-app-build', build)]:
        meta = '<meta name="' + name + '" content="' + value + '">'
        pattern = r'<meta\s+name="' + name + r'"\s+content="[^"]*"\s*>'
        text = re.sub(pattern, lambda _: meta, text) if re.search(pattern, text) else text.replace('</head>', meta + '</head>', 1)

    def version_tag(match):
        return re.sub(r'(src|href)="([^"]+)"', lambda attr: attr[1] + '="' + asset_url(attr[2], build) + '"', match[0])

    text = re.sub(r'<(?:script|link)\b[^>]*>', version_tag, text)
    page.write_text(text)
    (root / 'app-version.json').write_text(json.dumps({'schema': 1, 'revision': revision, 'build': build}) + '\n')
    worker = root / 'service-worker.js'
    sw = worker.read_text()
    sw = re.sub(r"const CACHE = '[^']+';", "const CACHE = 'd4-iphone-build-" + build + "';", sw, count=1)
    match = re.search(r'const ASSETS = (\[[\s\S]*?\]);', sw)
    assets = [asset_url(value, build) for value in ast.literal_eval(match[1])]
    sw = sw[:match.start(1)] + json.dumps(assets) + sw[match.end(1):]
    worker.write_text(sw)
    return {'schema': 1, 'revision': revision, 'build': build}


if __name__ == '__main__':
    print(json.dumps(stamp(Path(__file__).resolve().parents[1])))
