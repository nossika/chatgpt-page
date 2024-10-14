// 显式展示代码依赖（从 CDN 脚本引入的 window 全局变量）
var { Vue, Vuetify, marked } = window;

const util = {
  request: {
    post: async (url, data) => {
      const response = await window.fetch(url, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'X-Key': util.getURLParams('key'),
        },
        body: JSON.stringify(data),
      });

      if (response.status !== 200) {
        throw new Error(`${url} ${response.status} ${JSON.stringify(await response.json())}`);
      }

      return response;
    },
    get: async (url, params) => {
      const paramsString = new URLSearchParams(params).toString();

      const response = await window.fetch(
        paramsString ? `${url}?${paramsString}` : url, 
        {
          method: 'get',
          headers: {
            'X-Key': util.getURLParams('key'),
          },
        }
      );

      if (response.status !== 200) {
        throw new Error(`${url} ${response.status} ${JSON.stringify(await response.json())}`);
      }

      return response;
    },
  },

  getURLParams(key) {
    const params = new URLSearchParams(location.search);
    return params.get(key) || '';
  },

  setURLParams(key, val) {
    const params = new URLSearchParams(location.search);
    params.set(key, val);
    history.pushState(null, '', `?${params.toString()}`);
  },
};

const ChatApp = {
  setup() {
    const { ref, reactive, onMounted } = Vue;
    const loading = ref(false);
    const input = ref('');
    const messageSalt = ref('');
    const conversations = reactive([]);
    const CONVERSATION_TYPE = {
      Q: 'Q',
      A: 'A',
    };

    onMounted(async () => {
      loading.value = true;
      const res = await util.request.get('/message-stream-salt')
        .then(res => res.json())
        .finally(() => {
          loading.value = false;
        });

      messageSalt.value = res.data;
    });
    
    const sendMessage = async () => {
      if (loading.value || !input.value) return;
      loading.value = true;
      const question = input.value;
      input.value = '';

      const context = conversations.slice();

      conversations.push({
        type: CONVERSATION_TYPE.Q,
        content: question,
      });

      conversations.push({
        type: CONVERSATION_TYPE.A,
        content: '...',
      });
      
      // 先 push 到 conversations，再从中获取响应式的对象，使得后续对其修改能响应到 UI 上
      const reactiveAnswer = conversations[conversations.length - 1];
    
      try {
        const response = await util.request.post('/message-stream', {
          message: question,
          context,
        });
  
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let rawText = '';
  
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          rawText += decoder.decode(value);
          // 原始数据中有 salt，使用前需要先替换
          rawText = rawText.replaceAll(messageSalt.value, '');
          const mdText = marked.parse(rawText);
          if (!mdText) continue;
          reactiveAnswer.content = mdText;
        }
  
        reactiveAnswer.content = marked.parse(rawText);
      } catch (err) {
        reactiveAnswer.content = err.toString();
      }

      loading.value = false;
    };

    return {
      input,
      loading,
      sendMessage,
      conversations,
      CONVERSATION_TYPE,
    };
  },
  template: `
    <div>
      <v-card 
        v-for="(c, i) in conversations"
        class="pa-4 mb-6 d-flex"
        :loading="loading && i === conversations.length - 1"
      >
        <v-chip 
          class="mr-4 mt-3 flex-grow-0 flex-shrink-0"
          label
          :color="{[CONVERSATION_TYPE.Q]: 'primary', [CONVERSATION_TYPE.A]: 'purple'}[c.type]"
        >
          {{ c.type }}
        </v-chip>
        <div
          class="px-6 py-4 flex-grow-1 flex-shrink-1 border"
          v-html="c.content"
        >
      </v-card>
      <v-card class="pa-4">
        <v-textarea 
          label="Your Question"
          variant="outlined"
          v-model="input"
          @keyup.ctrl.enter="sendMessage"
          placeholder="Use Ctrl + Enter to send"
        />
        <v-btn
          @click="sendMessage"
          :loading="loading"
          :disabled="!input"
          class="mt-n2" color="teal-darken-1"
          prepend-icon="mdi-send"
        >
          SEND
        </v-btn>
      </v-card>
    </div>
  `,
};

const ImageApp = {
  setup() {
    const { ref } = Vue;
    const loading = ref(false);
    const description = ref('');
    const imageTitle = ref('');
    const imageURL = ref('');

    const drawImage = async () => {
      if (loading.value || !description.value) return;
      loading.value = true;
      imageTitle.value = description.value;
      description.value = '';

      try {
        const raw = await util.request.post('/draw-image', {
          description: imageTitle.value,
        });

        const res = await raw.json();

        if (res.code !== 0) {
          throw new Error(res.data || JSON.stringify(res));
        }

        imageURL.value = res.data;
      } catch (err) {
        imageTitle.value = err.toString();
      }

      loading.value = false;
    };

    return {
      loading,
      description,
      imageTitle,
      imageURL,
      drawImage,
    };
  },
  template: `
    <div>
      <v-card
        v-if="imageTitle"
        class="pa-4 mb-5"
        :loading="loading"
      >
        <div class="text-center">{{ imageTitle }}</div>
        <v-img v-if="imageURL" :src="imageURL">
          <template v-slot:placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular indeterminate />
            </div>
          </template>
        </v-img>
      </v-card>
      <v-card class="pa-4">
        <v-text-field label="Your Description" variant="outlined" v-model="description" @keyup.ctrl.enter="drawImage" placeholder="Use Ctrl + Enter to draw" />
        <v-btn
          @click="drawImage" :loading="loading" :disabled="!description"
          class="mt-n2" color="teal-darken-1" prepend-icon="mdi-draw"
        >
          DRAW
        </v-btn>
      </v-card>
    </div>
  `,
};

const TranslateApp = {
  setup() {
    const { ref, computed } = Vue;
    const loading = ref(false);
    const inputText = ref('');
    const originalText = ref('');
    const translateResp = ref(null);
    const errorMessage = ref('');
    const originalLang = ref('');
    const targetLangs = ref(['zh']);

    const allLangs = [
      { title: '简体中文', value: 'zh' },
      { title: '繁體中文', value: 'zh-hant' },
      { title: 'English', value: 'en' },
      { title: '日本語', value: 'ja' },
      { title: '한국어', value: 'ko' },
      { title: 'Français', value: 'fr' },
      { title: 'Deutsch', value: 'de' },
      { title: 'Español', value: 'es' },
      { title: 'Русский язык', value: 'ru' },
      { title: 'हिन्दी', value: 'hi' },
      { title: 'ภาษาไทย', value: 'th' },
      { title: 'اَلْعَرَبِيَّةُ', value: 'ar' },
    ];

    const getLangTitle = (value) => {
      return allLangs.find(l => l.value === value)?.title || '';
    };

    const translate = async () => {
      if (loading.value || !inputText.value) return;
      errorMessage.value = '';
      originalText.value = inputText.value;
      inputText.value = '';

      loading.value = true;
      try {
        const raw = await util.request.post('/translate', {
          text: originalText.value,
          targetLangs: targetLangs.value,
          originalLang: originalLang.value,
        });

        const res = await raw.json();

        if (res.code !== 0) {
          throw new Error(res.data || JSON.stringify(res));
        }

        translateResp.value = res.data;
      } catch (err) {
        errorMessage.value = err.toString();
      } finally {
        loading.value = false;
      }
    };

    const translations = computed(() => {
      const result = [];
      if (originalText.value) {
        result.push({
          lang: 'Original' + (originalLang.value ? `(${getLangTitle(originalLang.value)})` : ''), 
          text: originalText.value,
        });
      }

      translateResp.value && Object.entries(translateResp.value).forEach(([key, value]) => {
        result.push({ 
          lang: getLangTitle(key), 
          text: value,
        });
      });

      return result;
    });

    return {
      inputText,
      translate,
      errorMessage,
      loading,
      originalLang,
      targetLangs,
      translations,
      allLangs,
    };
  },
  template: `
    <div>
      <v-card class="pa-4">
        <v-textarea label="Original Text" variant="outlined" v-model="inputText" @keyup.ctrl.enter="translate" placeholder="Use Ctrl + Enter to submit" />
        <v-select
          variant="outlined"
          label="Original Language"
          v-model="originalLang"
          :items="[{ title: 'Auto', value: '' }].concat(allLangs)"
        ></v-select>
        <v-select
          variant="outlined"
          label="Target Languages"
          multiple
          v-model="targetLangs"
          :items="allLangs"
        ></v-select>
        <v-btn
          @click="translate" :loading="loading" :disabled="!inputText || !targetLangs.length"
          class="mt-n2" color="teal-darken-1" prepend-icon="mdi-translate"
        >
          TRANSLATE
        </v-btn>
      </v-card>
      <v-card v-if="translations.length || errorMessage" :loading="loading" class="pa-4 mt-4">
        <v-alert v-if="errorMessage" color="error" class="mb-4">
          {{ errorMessage }}
        </v-alert>
        <v-table v-if="translations.length">
          <thead>
            <tr>
              <th class="text-left">
                Language
              </th>
              <th class="text-left">
                Text
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in translations"
              :key="item.lang"
            >
              <td>{{ item.lang }}</td>
              <td>{{ item.text }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>
  `,
};

const App = {
  setup() {
    const { ref, watchEffect } = Vue;
    const tabs = [
      {
        key: 'chat',
        name: 'chat',
        component: 'ChatApp',
      },
      {
        key: 'translate',
        name: 'translate',
        component: 'TranslateApp',
      },
      util.getURLParams('enable-image') && {
        key: 'image',
        name: 'image',
        component: 'ImageApp',
      },
    ].filter(Boolean);

    const tab = ref(util.getURLParams('tab') || 'chat');

    watchEffect(() => {
      util.setURLParams('tab', tab.value);
    });

    return {
      tabs,
      tab,
    };
  },
  template: `
    <v-container>
      <div class="mb-5 d-flex justify-center">
        <v-btn-toggle
          v-model="tab"
          color="cyan-lighten-4"
          density="compact"
        >
          <v-btn v-for="t in tabs" :value="t.key" :key="t.key">
            {{ t.name }}
          </v-btn>
        </v-btn-toggle>
      </div>
      <div>
        <template v-for="t in tabs">
          <component :is="t.component" v-if="tab === t.key"/>
        </template>
      </div>
    </v-container>
  `,
};
const { createApp } = Vue;
const { createVuetify } = Vuetify;

const app = createApp(App);
const vuetify = createVuetify();

app.component('ChatApp', ChatApp);
app.component('TranslateApp', TranslateApp);
app.component('ImageApp', ImageApp);

app.use(vuetify).mount('#app');
