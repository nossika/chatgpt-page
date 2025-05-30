import { OpenAI } from 'openai';
import httpsAgent from '@/util/agent';
import type { ChatCompletionMessageParam, ChatCompletionUserMessageParam } from 'openai/resources';

class ChatGPT {
  private openai: OpenAI;
  private langModel: string;
  constructor({
    langModel,
    apiKey,
    apiBaseURL,
  }: {
    langModel: string;
    apiKey: string;
    apiBaseURL?: string;
  }) {
    this.openai = new OpenAI({
      apiKey,
      baseURL: apiBaseURL,
      httpAgent: httpsAgent,
    });
    this.langModel = langModel;
  }

  async sendMessage(content: ChatCompletionUserMessageParam['content'], context?: ChatCompletionMessageParam[]) {
    const messages = context?.slice() || [];
    messages.push({
      role: 'user',
      content: content,
    });

    const res = await this.openai.chat.completions.create({
      model: this.langModel,
      messages,
      response_format: {
        type: 'text',
      },
    });

    const answer = res.choices[0]?.message?.content;
  
    return answer;
  }

  async getMessageStream(content: ChatCompletionUserMessageParam['content'], context?: ChatCompletionMessageParam[]) {
    const messages = context?.slice() || [];
    messages.push({
      role: 'user',
      content: content,
    });

    const stream = await this.openai.chat.completions.create({
      model: this.langModel,
      messages,
      response_format: {
        type: 'text',
      },
      stream: true,
    });

    async function* iterator() {
      for await (const chunk of stream) {
        yield chunk.choices[0]?.delta?.content || '';
      }
    }

    const proxyStream = {
      [Symbol.asyncIterator]() {
        return iterator();
      },
    };

    return proxyStream;
  }

  async translate(text: string, targetLangs: string[], originalLang?: string) {
    interface TranslateResult {
      [lang: string]: string;
    }

    const outputExample = targetLangs.reduce((json, lang) => {
      json[lang] = '';
      return json;
    }, {} as TranslateResult);

    const systemPrompt = `You are an translation assistant that translates >>>source_text<<< ${originalLang ? `from language ${originalLang}` : ''}to languages: ${targetLangs.join(', ')}, the final output should be a valid JSON. Please provide output by JSON without any explanation, and output format should like ${JSON.stringify(outputExample)}.`;

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: JSON.stringify({
          source_text: text,
        }),
      },
    ];

    const res = await this.openai.chat.completions.create({
      model: this.langModel,
      temperature: 0.2,
      messages,
      response_format:{
        type: 'json_object',
      },
    });

    const content = res.choices[0]?.message?.content;

    let json = {} as TranslateResult;
    try {
      json = JSON.parse(content);
    } catch (err) {
      throw new Error(`Invalid JSON: ${content}`);
    }

    return json;
  }

  async drawImage(description: string) {
    const res = await this.openai.images.generate({
      prompt: description,
      n: 1,
    });

    return res.data[0]?.url || '';
  }
}

let instance: ChatGPT | null = null;

const chatGPT = {
  init: ({
    langModel,
    apiKey,
    apiBaseURL,
  }: {
    langModel: string;
    apiKey: string;
    apiBaseURL?: string;
  }) => {
    instance = new ChatGPT({
      langModel,
      apiKey,
      apiBaseURL,
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
