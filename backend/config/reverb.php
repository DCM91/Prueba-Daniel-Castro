<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Reverb Server
    |--------------------------------------------------------------------------
    |
    | This option controls which Reverb server is used by default. The
    | default server is determined by the "REVERB_SERVER" environment
    | variable. Each server defined below should correspond to a unique
    | entry in your "connections" array.
    |
    */

    'default' => env('REVERB_SERVER', 'reverb'),

    /*
    |--------------------------------------------------------------------------
    | Reverb Servers
    |--------------------------------------------------------------------------
    |
    | Here you may define all of the Reverb servers that your application
    | will use to communicate with your clients. Each server should
    | correspond to a unique "app_id" and "key" combination.
    |
    */

    'servers' => [

        'reverb' => [
            'host' => env('REVERB_SERVER_HOST', '0.0.0.0'),
            'port' => env('REVERB_SERVER_PORT', 8080),
            'hostname' => env('REVERB_HOST'),
            'options' => [
                'tls' => env('REVERB_SCHEME', 'http') === 'https',
            ],
            'max_request_size' => env('REVERB_MAX_REQUEST_SIZE', 10_000),
            'scaling' => [
                'enabled' => env('REVERB_SCALING_ENABLED', false),
                'channel' => env('REVERB_SCALING_CHANNEL', 'reverb'),
                'server' => [
                    'url' => env('REVERB_SCALING_SERVER_URL'),
                    'host' => env('REVERB_SCALING_SERVER_HOST'),
                    'port' => env('REVERB_SCALING_SERVER_PORT', 8080),
                    'username' => env('REVERB_SCALING_SERVER_USERNAME'),
                    'password' => env('REVERB_SCALING_SERVER_PASSWORD'),
                ],
            ],
            'pulse_ingest_interval' => env('REVERB_PULSE_INGEST_INTERVAL', 15),
            'telescope_ingest_interval' => env('REVERB_TELESCOPE_INGEST_INTERVAL', 15),
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Reverb Application
    |--------------------------------------------------------------------------
    |
    | This value controls the application used by Reverb. Reverb applications
    | can be managed via the Reverb dashboard and will be created automatically
    | when starting the server.
    |
    */

    'apps' => [

        'provider' => 'config',

        'apps' => [
            [
                'key' => env('REVERB_APP_KEY'),
                'secret' => env('REVERB_APP_SECRET'),
                'app_id' => env('REVERB_APP_ID'),
                'options' => [
                    'host' => env('REVERB_HOST'),
                    'port' => env('REVERB_PORT', 443),
                    'scheme' => env('REVERB_SCHEME', 'https'),
                    'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
                ],
                'allowed_origins' => [
                    env('FRONTEND_URL', 'http://localhost:4200'),
                ],
                'ping_interval' => env('REVERB_PING_INTERVAL', 60),
                'activity_timeout' => env('REVERB_ACTIVITY_TIMEOUT', 30),
                'max_message_size' => env('REVERB_MAX_MESSAGE_SIZE', 10_000),
            ],
        ],

    ],

];
