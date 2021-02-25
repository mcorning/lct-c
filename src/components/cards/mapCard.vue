<template>
  <v-card class="pa-4" flat height="5o0px">
    <v-row align="center" justify="space-around">
      <v-col cols="8" class="text-center">
        <v-text-field
          hide-details
          prepend-icon="mdi-magnify"
          single-line
        ></v-text-field>
      </v-col>
      <v-col cols="1" class="text-center">
        <v-btn icon>
          <v-icon>mdi-crosshairs-gps</v-icon>
        </v-btn>
      </v-col>

      <v-col cols="1" class="text-center">
        <v-btn icon>
          <v-icon>mdi-dots-vertical</v-icon>
        </v-btn>
      </v-col>
    </v-row>

    <v-row align="start" class="mt-1">
      <v-img
        alt="campus"
        class="shrink mr-2"
        contain
        src="@/assets/campus.jpg"
      />
    </v-row>
  </v-card>
</template>

<script>
export default {};
</script>
