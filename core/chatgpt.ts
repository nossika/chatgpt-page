import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from 'openai';
import request from '@/util/request';

const model = 'gpt-3.5-turbo';

class ChatGPT {
  private openai: OpenAIApi;
  constructor({
    key,
    org,
  }: {
    key: string;
    org: string;
  }) {
    const configuration = new Configuration({
      organization: org,
      apiKey: key,
    });
    
    const openai = new OpenAIApi(configuration, undefined, request);

    this.openai = openai;
  }

  async sendMessage(message: string, context?: ChatCompletionRequestMessage[]) {
    const messages = context?.slice() || [];
    messages.push({
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message,
    });

    const res = await this.openai.createChatCompletion({
      model,
      messages,
    });

    const content = res.data.choices[0]?.message?.content;
  
    return content;
  }

  async getMessageStream(message: string, context?: ChatCompletionRequestMessage[]) {
    const messages = context?.slice() || [];
    messages.push({
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message,
    });

    const res = await this.openai.createChatCompletion({
      model,
      messages,
      stream: true,
    }, {
      responseType: 'stream',
    });

    return res.data as any as Receiver;
  }
}

export interface Receiver {
  on: (type: 'data' | 'end', handler: (data: Buffer) => void) => void;
}

export default ChatGPT;

