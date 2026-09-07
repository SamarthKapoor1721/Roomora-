import { aiClient } from '../../lib/aiClient';
import { notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { gatherContext } from './assistant.tools';

export const assistantService = {
  async listConversations(ownerId: string) {
    return prisma.aiConversation.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  },

  async getConversation(ownerId: string, id: string) {
    const convo = await prisma.aiConversation.findFirst({
      where: { id, ownerId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!convo) throw notFound('Conversation not found');
    return convo;
  },

  async deleteConversation(ownerId: string, id: string) {
    const convo = await prisma.aiConversation.findFirst({ where: { id, ownerId } });
    if (!convo) throw notFound('Conversation not found');
    await prisma.aiConversation.delete({ where: { id } });
  },

  /**
   * Ask the assistant a question. Real DB data is retrieved via deterministic
   * tools and passed as context; the AI is told to answer only from it.
   */
  async ask(ownerId: string, input: { question: string; conversationId?: string }) {
    let conversation = input.conversationId
      ? await prisma.aiConversation.findFirst({ where: { id: input.conversationId, ownerId } })
      : null;
    if (!conversation) {
      conversation = await prisma.aiConversation.create({
        data: {
          ownerId,
          title: input.question.slice(0, 60),
        },
      });
    }

    const history = await prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const { tools, context } = await gatherContext(ownerId, input.question);

    await prisma.aiMessage.create({
      data: { conversationId: conversation.id, role: 'user', content: input.question },
    });

    const response = await aiClient.assistant({
      question: input.question,
      context,
      history: history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: response.answer,
        source: response.source,
        usedTools: { tools, context } as never,
      },
    });

    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId: conversation.id,
      message: assistantMessage,
      source: response.source,
      model: response.model,
      dataUsed: { tools, context },
    };
  },
};
