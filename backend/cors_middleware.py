class CORSMiddleware:
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        # If this is an OPTIONS request, respond immediately with CORS headers
        if environ.get('REQUEST_METHOD') == 'OPTIONS':
            headers = [
                ('Content-Type', 'text/plain'),
                ('Access-Control-Allow-Origin', '*'),
                ('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'),
                ('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With'),
                ('Access-Control-Max-Age', '3600'),
                ('Content-Length', '0')
            ]
            start_response('200 OK', headers)
            return [b'']

        def custom_start_response(status, headers, exc_info=None):
            # Add CORS headers to all responses
            cors_headers = [
                ('Access-Control-Allow-Origin', '*'),
                ('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'),
                ('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
            ]
            new_headers = []
            for header in headers:
                # Don't add duplicate headers
                if header[0] not in [ch[0] for ch in cors_headers]:
                    new_headers.append(header)
            new_headers.extend(cors_headers)
            return start_response(status, new_headers, exc_info)

        return self.app(environ, custom_start_response)