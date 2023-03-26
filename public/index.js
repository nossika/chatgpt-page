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
  <v-text-field label="your question" variant="outlined" :question="question" @input="setQuestion" @keyup.enter="ask" :loading="loading" :value="question">
    <template v-slot:append>
      <v-btn class="mt-n2" @click="ask" :loading="loading" :disabled="!question">
        ASK
      </v-btn>
    </template>
  </v-text-field>
</div>
</div>
`;

const App = {
  setup() {
    const loading = ref(false);
    const question = ref('');
    const conversations = reactive([]);
    const conversationType = {
      Q: 'Q',
      A: 'A',
    };

    const ask = async () => {
      if (loading.value || !question.value) return;
      loading.value = true;
      const q = question.value;

      conversations.push({
        type: conversationType.Q,
        content: q,
      });

      question.value = '';

      const res = await request.post('/ask', {
        question: q,
        context: conversations,
      });

      const a = res.data;

      conversations.push({
        type: conversationType.A,
        content: a,
      });

      loading.value = false;
    };

    const setQuestion = (event) => {
      question.value = event.target.value;
    };

    return {
      question,
      setQuestion,
      loading,
      ask,
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
