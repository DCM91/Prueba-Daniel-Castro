<?php

declare(strict_types=1);

namespace App\Broadcasting;

use App\Models\Conversation;

/**
 * Authorisation logic for the private broadcasting channels used by the chat
 * feature. Keeping the closures in routes/channels.php tiny and delegating
 * the actual policy to this class makes the rules testable in isolation.
 */
final class ChatChannelAuthorizer
{
    /**
     * Authorise a user to subscribe to a private conversation channel.
     * Channel name pattern: `conversation.{conversationId}`.
     */
    public function authorizeConversation(int $userId, int $conversationId): bool
    {
        $conversation = Conversation::find($conversationId);
        if ($conversation === null) {
            return false;
        }
        return $conversation->hasParticipant($userId);
    }

    /**
     * Authorise a user to subscribe to their own private user channel.
     * Channel name pattern: `user.{userId}`.
     */
    public function authorizeUser(int $subscriberId, int $channelUserId): bool
    {
        return $subscriberId === $channelUserId;
    }
}
