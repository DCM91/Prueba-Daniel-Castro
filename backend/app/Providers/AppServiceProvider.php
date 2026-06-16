<?php

namespace App\Providers;

use App\Services\Cloudinary\CloudinaryService;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use SocialiteProviders\Facebook\FacebookExtendSocialite;
use SocialiteProviders\Google\GoogleExtendSocialite;
use SocialiteProviders\Manager\SocialiteWasCalled;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(CloudinaryServiceInterface::class, function ($app) {
            $config = $app['config']->get('services.cloudinary');

            return new CloudinaryService(
                $app->make(HttpFactory::class),
                (string) ($config['cloud_name'] ?? ''),
                (string) ($config['api_key'] ?? ''),
                (string) ($config['api_secret'] ?? ''),
                (array)  ($config['presets'] ?? []),
                (array)  ($config['folders'] ?? []),
            );
        });
    }

    public function boot(): void
    {
        Event::listen(SocialiteWasCalled::class, function (SocialiteWasCalled $event) {
            $event->extendSocialite('google', GoogleExtendSocialite::class);
            $event->extendSocialite('facebook', FacebookExtendSocialite::class);
        });
    }
}
