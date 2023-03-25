import { Configuration, OpenAIApi } from 'openai';
import request from '@/util/request';

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

  async ask(message: string) {
    const res = await this.openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: message,
      }]
    });

    const content = res.data.choices[0]?.message?.content;
  
    return content;
  }
}

export default ChatGPT;

