const { createApp, ref, reactive, watchEffect, computed } = Vue;

const decoder = new TextDecoder();

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
        throw new Error(`${url}: ${response.status} ${JSON.stringify(await response.json())}`);
      }

      return response;
    },
    stream: async (url, data) => {
      const response = await window.fetch(url, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'X-Key': util.getURLParams('key'),
        },
        body: JSON.stringify(data),
      });

      if (response.status !== 200) {
        throw new Error(`${url}: ${response.status} ${JSON.stringify(await response.json())}`);
      }
  
      return response.body.getReader();
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

  parseStreamData: (uint8Array, lastRemainStr = '') => {
    const originStr = decoder.decode(uint8Array);
    let remainStr = '';
  
    // split originStr by line
    const dataStrs = (lastRemainStr + originStr)
      .split('\n')
      .map(s => s.trim())
      .filter(s => !!s);
  
    const jsons = [];
  
    for (let i = 0; i < dataStrs.length; i += 1) {
      // each line starts with 'data: '
      const JSONStr = dataStrs[i].replace('data: ', '');
      let json;
      try {
        json = JSON.parse(JSONStr);
        json && jsons.push(json);
      } catch (err) {
        if (i === dataStrs.length - 1) {
          // if the last line cannot be parsed, it is usually because the line is incomplete, and it should be left over for the next parsing
          remainStr = dataStrs[i];
        }
      }
    };
  
    return {
      jsons,
      remainStr,
    };
  },

  concatUint8Arrays: (uint8Arrays) => {
    let length = 0;
    for (const a of uint8Arrays) {
      length += a.length;
    }
  
    const arr = new Uint8Array(length);
  
    let offset = 0;
    for (const a of uint8Arrays) {
      arr.set(a, offset);
      offset += a.length;
    }
  
    return arr;
  },
};

const ChatApp = {
  setup() {
    const loading = ref(false);
    const message = ref('');
    const conversations = reactive([]);
    const CONVERSATION_TYPE = {
      Q: 'Q',
      A: 'A',
    };

    const sendMessage = async () => {
      if (loading.value || !message.value) return;
      loading.value = true;
      const m = message.value;
      const context = conversations.slice();

      conversations.push({
        type: CONVERSATION_TYPE.Q,
        content: m,
      });

      message.value = '';

      conversations.push({
        type: CONVERSATION_TYPE.A,
        content: '',
      });
      
      // get reactive obejct
      const answer = conversations[conversations.length - 1];

      try {
        const reader = await util.request.stream('/message-stream', {
          message: m,
          context,
        });

        let lastRemainStr = '';
        const uint8Arrays = [];

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          uint8Arrays.push(value);

          const { jsons, remainStr } = util.parseStreamData(value, lastRemainStr);
          lastRemainStr = remainStr;

          jsons.forEach(data => {
            const chunk = data.choices[0].delta.content || '';
            answer.content += chunk;
          });
        }

        // to avoid parsing errors caused by inconsistent data, the complete data will be parsed again to ensure coherence
        const uint8Array = util.concatUint8Arrays(uint8Arrays);
        const { jsons } = util.parseStreamData(uint8Array);
        let content = '';
        jsons.forEach(data => {
          const chunk = data.choices[0].delta.content || '';
          content += chunk;
        });
        answer.content = content;
      } catch (err) {
        answer.content = err.toString();
      }

      loading.value = false;
    };

    const setMessage = (event) => {
      message.value = event.target.value;
    };

    return {
      message,
      setMessage,
      loading,
      sendMessage,
      conversations,
      CONVERSATION_TYPE,
    };
  },
  template: `
    <div>
      <v-card v-for="(c, i) in conversations" style="margin-bottom: 20px; padding: 10px; display: flex;" :loading="loading && i === conversations.length - 1">
        <v-chip style="flex-grow: 0; flex-shrink: 0; margin-right: 10px; margin-top: 6px;"
          label
          :color="{[CONVERSATION_TYPE.Q]: 'primary', [CONVERSATION_TYPE.A]: 'cyan'}[c.type]"
        >
          {{ c.type }}
        </v-chip>
        <pre style="padding: 10px; white-space: pre-wrap; border: 1px solid #eee; flex-grow: 1; flex-shrink: 1;">{{ c.content }}</pre>
      </v-card>
      <v-card class="pa-4">
        <v-textarea label="your message" variant="outlined" :value="message" @input="setMessage" @keyup.ctrl.enter="sendMessage" placeholder="Use Ctrl + Enter to send" />
        <v-btn
          @click="sendMessage" :loading="loading" :disabled="!message"
          class="mt-n2" color="teal-darken-1" prepend-icon="mdi-send"
        >
          SEND
        </v-btn>
      </v-card>
    </div>
  `,
};

const ImageApp = {
  setup() {
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

    const setDiscription = (event) => {
      description.value = event.target.value;
    };

    return {
      loading,
      description,
      imageTitle,
      imageURL,
      setDiscription,
      drawImage,
    };
  },
  template: `
    <div>
      <v-card
        v-if="imageTitle"
        style="padding: 10px; margin-bottom: 20px;"
        :loading="loading"
      >
        <div style="text-align: center;">{{ imageTitle }}</div>
        <v-img v-if="imageURL" :src="imageURL">
          <template v-slot:placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular indeterminate />
            </div>
          </template>
        </v-img>
      </v-card>
      <v-card class="pa-4">
        <v-text-field label="your description" variant="outlined" :value="description" @input="setDiscription" @keyup.ctrl.enter="drawImage" placeholder="Use Ctrl + Enter to draw" />
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
      { title: 'Français', value: 'fr' },
      { title: 'Deutsch', value: 'de' },
      { title: 'Español', value: 'es' },
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
        <v-textarea label="original text" variant="outlined" v-model="inputText" @keyup.ctrl.enter="translate" placeholder="Use Ctrl + Enter to submit" />
        <v-select
          variant="outlined"
          label="Original language"
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
    const TAB = {
      chat: 'chat',
      image: 'image',
      translate: 'translate',
    };

    const tab = ref(util.getURLParams('tab') || TAB.chat);

    watchEffect(() => {
      util.setURLParams('tab', tab.value);
    });

    return {
      TAB,
      tab,
    };
  },
  template: `
    <v-container>
      <div style="margin-bottom: 20px; display: flex; justify-content: center;">
        <v-btn-toggle
          v-model="tab"
          color="cyan-lighten-4"
          density="compact"
        >
          <v-btn v-for="(val, key) in TAB" :value="val" :key="key">
            {{ key }}
          </v-btn>
        </v-btn-toggle>
      </div>
      <div>
        <chat-app v-show="tab === TAB.chat"/>
        <image-app v-show="tab === TAB.image"/>
        <translate-app v-show="tab === TAB.translate"/>
      </div>
    </v-container>
  `,
};

const { createVuetify } = Vuetify;

const vuetify = createVuetify();
const app = createApp(App);

app.component('ChatApp', ChatApp);
app.component('ImageApp', ImageApp);
app.component('TranslateApp', TranslateApp);

app.use(vuetify).mount('#app');
