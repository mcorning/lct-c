<template>
  <div>
    <v-row align="center" justify="center">
      <v-spacer></v-spacer>
      <v-col cols="12">
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
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-dialog v-model="dialog" persistent max-width="600px">
              <template v-slot:activator="{ on, attrs }">
                <v-btn color="primary" dark v-bind="attrs" v-on="on">
                  Next
                </v-btn>
              </template>
              <v-card>
                <v-card-title class="headline">
                  Let's get to work
                </v-card-title>

                <v-card-text>
                  If you proceed, you will always log on to the server as
                  {{ username }}. Ready?
                </v-card-text>

                <v-card-actions>
                  <v-spacer></v-spacer>

                  <v-btn color="green darken-1" text @click="dialog = false">
                    No
                  </v-btn>

                  <v-btn color="green darken-1" text @click="onGo">
                    Absolutely
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
export default {
  name: 'Welcome',

  data() {
    return {
      dialog: false,
      nsp: 'Sisters',
      username: '',
      rules: [(v) => v.length > 2 || 'Between 3 and 10 characters'],
    };
  },

  methods: {
    onSubmit() {
      this.dialog = true;
    },

    onGo() {
      this.dialog = false;

      this.$emit('input', this.username);
    },
  },
};
</script>
