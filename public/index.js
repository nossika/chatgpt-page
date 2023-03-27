const { ref, reactive } = Vue;

const request = {
  post: async (url, data) => {
    const response = await window.fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
}

const template = `
<div style="padding: 20px;">
  <v-card v-for="c in conversations" style="margin-bottom: 20px; padding: 10px; display: flex;">
    <v-chip style="flex-grow: 0; flex-shrink: 0; margin-right: 10px; margin-top: 6px;"
      label
      :color="{[conversationType.Q]: 'primary', [conversationType.A]: 'cyan'}[c.type]"
    >
      {{ c.type }}
    </v-chip>
    <pre style="padding: 10px; white-space: pre-wrap; border: 1px solid #eee; flex-grow: 1; flex-shrink: 1;">{{ c.content }}</pre>
  </v-card>
  <div>
  <v-text-field label="your message" variant="outlined" :value="message" @input="setMessage" @keyup.enter="sendMessage" :loading="loading">
    <template v-slot:append>
      <v-btn class="mt-n2" @click="sendMessage" :loading="loading" :disabled="!message">
        SEND
      </v-btn>
    </template>
  </v-text-field>
</div>
</div>
`;

const App = {
  setup() {
    const loading = ref(false);
    const message = ref('');
    const conversations = reactive([]);
    const conversationType = {
      Q: 'Q',
      A: 'A',
    };

    const sendMessage = async () => {
      if (loading.value || !message.value) return;
      loading.value = true;
      const m = message.value;
      const context = conversations.slice();

      conversations.push({
        type: conversationType.Q,
        content: m,
      });

      message.value = '';

      const res = await request.post('/message', {
        message: m,
        context,
      });

      const answer = res.data;

      conversations.push({
        type: conversationType.A,
        content: answer,
      });

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
      conversationType,
    };
  },
  template,
};

const { createApp } = Vue;
const { createVuetify } = Vuetify;

const vuetify = createVuetify();
const app = createApp(App);
app.use(vuetify).mount('#app');
