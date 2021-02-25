<template>
  <v-form>
    <v-container>
      <v-row>
        <v-spacer></v-spacer>
        <v-col cols="12" sm="8">
          <v-card>
            <v-card-title>Welcome to {{ nsp }}</v-card-title>
            <v-card-subtitle
              >LCT is our community's way of getting back to work
              safely</v-card-subtitle
            >
            <v-card-text>
              <v-text-field
                v-model="username"
                :rules="rules"
                counter="10"
                hint=""
                label="Enter your nickname"
                @blur="onSubmit()"
              ></v-text-field
            ></v-card-text>
          </v-card>
        </v-col>
        <v-spacer></v-spacer>
      </v-row>
    </v-container>
  </v-form>
</template>

<script>
export default {
  name: 'SelectUsername',
  data() {
    return {
      nsp: 'Sisters',

      username: '',
      rules: [(v) => v.length > 2 || 'Between 3 and 10 characters'],
    };
  },

  methods: {
    onSubmit() {
      if (!this.username) {
        return;
      }
      console.log('username', this.username);
      if (confirm(`${this.username}, are your ready to beat this virus?`)) {
        this.$emit('input', this.username);
      } else {
        alert('Maybe later?');
      }
    },
  },
};
</script>
