// Supabase Real-time Messaging Module
class VeilnetMessaging {
  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.listeners = new Map();
    this.initialized = false;
  }

  // Initialize messaging system
  async init() {
    if (this.initialized) return;
    
    try {
      // Set up real-time subscriptions
      this.setupConversationsSubscription();
      this.setupMessagesSubscription();
      
      this.initialized = true;
      console.log('Supabase messaging initialized');
    } catch (error) {
      console.error('Failed to initialize messaging:', error);
    }
  }

  // Subscribe to conversations
  setupConversationsSubscription() {
    const subscription = supabase
      .channel('public:conversations')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          this.handleConversationChange(payload);
        }
      )
      .subscribe();

    this.listeners.set('conversations', subscription);
  }

  // Subscribe to messages
  setupMessagesSubscription() {
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          this.handleNewMessage(payload);
        }
      )
      .subscribe();

    this.listeners.set('messages', subscription);
  }

  // Handle conversation changes
  handleConversationChange(payload) {
    const { eventType, new: conversation, old: oldConversation } = payload;
    
    switch (eventType) {
      case 'INSERT':
        this.conversations.set(conversation.id, conversation);
        break;
      case 'UPDATE':
        this.conversations.set(conversation.id, conversation);
        break;
      case 'DELETE':
        this.conversations.delete(conversation.id);
        break;
    }
    
    this.emit('conversationsChanged', Array.from(this.conversations.values()));
  }

  // Handle new messages
  handleNewMessage(payload) {
    const { new: message } = payload;
    
    // Add to messages cache
    if (!this.messages.has(message.conversation_id)) {
      this.messages.set(message.conversation_id, []);
    }
    this.messages.get(message.conversation_id).push(message);
    
    // Update conversation's last message
    const conversation = this.conversations.get(message.conversation_id);
    if (conversation) {
      conversation.last_message = message;
      conversation.updated_at = message.created_at;
      this.conversations.set(message.conversation_id, conversation);
    }
    
    this.emit('newMessage', message);
    this.emit('conversationsChanged', Array.from(this.conversations.values()));
  }

  // Get all conversations for user
  async getConversations() {
    try {
      const user = veilnetAuth.getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages!messages_conversations_fkey (
            content,
            created_at,
            sender_id,
            sender:profiles!messages_sender_id_fkey (username, avatar_url)
          )
        `)
        .or(`participants.cs.{${user.id}}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Cache conversations
      data.forEach(conv => this.conversations.set(conv.id, conv));
      return data;
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  }

  // Get messages for a conversation
  async getMessages(conversationId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Cache messages
      this.messages.set(conversationId, data);
      return data;
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  // Send a message
  async sendMessage(conversationId, content) {
    const user = veilnetAuth.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Create a new conversation
  async createConversation(participantIds, initialMessage = '') {
    const user = veilnetAuth.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          participants: [...participantIds, user.id],
          created_by: user.id
        })
        .select()
        .single();

      if (convError) throw convError;

      // Send initial message if provided
      if (initialMessage.trim()) {
        await this.sendMessage(conversation.id, initialMessage);
      }

      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesRead(conversationId) {
    const user = veilnetAuth.getCurrentUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('sender_id', 'neq', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  // Cleanup
  destroy() {
    this.listeners.forEach((subscription, key) => {
      supabase.removeChannel(subscription);
    });
    this.listeners.clear();
    this.conversations.clear();
    this.messages.clear();
    this.initialized = false;
  }
}

// Export singleton instance
const veilnetMessaging = new VeilnetMessaging();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { veilnetMessaging };
} else {
  window.veilnetMessaging = veilnetMessaging;
}
