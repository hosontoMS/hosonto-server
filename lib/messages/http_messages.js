const http_messages = {

    // 400 -- Client messages
    400: 'Bad Request.',
    401: 'Unauthorized.',
    402: 'Payment Required.',
    403: 'Forbidden.',
    404: 'Page Not Found.',
    405: 'Method Not Allowed.',
    406: 'Not Acceptable.',
    407: 'Proxy Authentication Required.',
    408: 'Request Timeout.',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'Request-URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Requested Range Not Satisfiable',
    417: 'Expectation Failed',
    418: 'I\'m a teapot',
    421: 'Misdirected Request',
    422: 'Unprocessable Entity',
    423: 'Locked',
    424: 'Failed Dependency',
    426: 'Upgrade Required',
    428: 'Precondition Required',
    429: 'Too Many Requests',
    431: 'Request Header Fields Too Large',
    444: 'Connection Closed Without Response',
    451: 'Unavailable For Legal Reasons',
    499: 'Client Closed Request',

    // 500 -- Server messages
    500: 'Internal Server Error.',
    501: 'Not Implemented.',
    502: 'Bad Gateway.',
    503: 'Service Unavailable.',
    504: 'Gateway Timeout.',
    505: 'HTTP Version Not Supported.',
    506: 'Variant Also Negotiates.',
    507: 'Insufficient Storage.',
    508: 'Loop Detected.',
    510: 'Not Extended.',
    511: 'Network Authentication Required.',
    520: 'Unknown error, Serverside failure.',
    599: 'Network Connect Timeout Error'

  
};

module.exports = http_messages;