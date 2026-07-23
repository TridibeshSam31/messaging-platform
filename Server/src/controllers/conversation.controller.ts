/*

Translates conversation adjustments, checks access rights, and returns JSON.

getConversations(req, res)
Operation: Calls conversationService.getUserConversations(req.userId).
Outputs: 200 OK with list.
postConversation(req, res)
Inputs: Validate type, memberIds, and optional name.
Operation: Calls either createPrivateConversation (if type is PRIVATE) or createGroupConversation (if type is GROUP).
Outputs: 201 Created with new conversation structure.
getConversation(req, res)
Inputs: Extract req.params.id.
Operation: Calls conversationService.getConversationById(id, req.userId).
Outputs: 200 OK or 403 Forbidden if not a member.
patchConversation(req, res)
Operation: Calls conversationService.updateConversation(req.params.id, req.userId, req.body).
deleteConversation(req, res)
Operation: Calls conversationService.leaveConversation(req.params.id, req.userId).
postMember(req, res)
Operation: Calls conversationService.addMember(req.params.id, req.userId, req.body.userId).
deleteMember(req, res)
Operation: Calls conversationService.removeMember(req.params.id, req.userId, req.params.userId).







*/