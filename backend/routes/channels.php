<?php

use App\Broadcasting\ChatChannelAuthorizer;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given callback receives the channel name and
| the User instance (or null for guests) and returns either true or false
| to indicate whether the channel may be used.
|
| Frontend (Angular) subscribes to:
|   - private-conversation.{id}     → real-time message stream for a chat
|   - private-user.{id}             → real-time unread count for the topbar
|
| The actual authorization policy lives in
| App\Broadcasting\ChatChannelAuthorizer so it can be unit-tested.
|
*/

$authorizer = new ChatChannelAuthorizer();

Broadcast::channel('conversation.{conversationId}', function ($user, int $conversationId) use ($authorizer): bool {
    return $authorizer->authorizeConversation((int) $user->id, $conversationId);
});

Broadcast::channel('user.{userId}', function ($user, int $userId) use ($authorizer): bool {
    return $authorizer->authorizeUser((int) $user->id, $userId);
});
