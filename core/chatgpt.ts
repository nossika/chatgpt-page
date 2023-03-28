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

  async drawImage(description: string) {
    const res = await this.openai.createImage({
      prompt: description,
      n: 1,
    });

    return res.data.data[0]?.url || '';
  }
}

export interface Receiver {
  on: (type: 'data' | 'end', handler: (data: Buffer) => void) => void;
}

let instance: ChatGPT | null = null;

const chatGPT = {
  init: ({
    key,
    org,
  }: {
    key: string,
    org: string,
  }) => {
    instance = new ChatGPT({
      key,
      org,
    });
  },
  get: () => {
    if (!instance) {
      throw new Error('Cannot get before init');
    }

    return instance;
  },
};

export default chatGPT;
