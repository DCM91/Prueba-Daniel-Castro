<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id'     => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect'      => env('GOOGLE_REDIRECT_URI'),
    ],

    'facebook' => [
        'client_id'     => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect'      => env('FACEBOOK_REDIRECT_URI'),
    ],

    'cloudinary' => [
        'cloud_name'    => env('CLOUDINARY_CLOUD_NAME'),
        'api_key'       => env('CLOUDINARY_API_KEY'),
        'api_secret'    => env('CLOUDINARY_API_SECRET'),
        'presets'       => [
            'avatar'    => env('CLOUDINARY_PRESET_AVATAR', 'fm_av_upl'),
            'cover'     => env('CLOUDINARY_PRESET_COVER', 'fm_cv_upl'),
            'portfolio' => env('CLOUDINARY_PRESET_PORTFOLIO', 'fm_pf_upl'),
            'brief'     => env('CLOUDINARY_PRESET_BRIEF', 'fm_br_upl'),
        ],
        'folders'       => [
            'avatar'    => 'framematch/avatars',
            'cover'     => 'framematch/covers',
            'portfolio' => 'framematch/portfolios',
            'brief'     => 'framematch/briefs',
        ],
    ],

];
