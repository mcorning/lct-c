<template>
  <div class="GoogleMap" style="width: 75vw; height: 53vh" />
</template>

<script>
import gmapsInit from '../../maps/gmaps';
import { data } from '../../maps/communityData.json';
const centralLocation = [44.29160723928563, -121.5441825899421];

export default {
  name: 'GoogleMap',
  async mounted() {
    try {
      const google = await gmapsInit();
      const map = new google.maps.Map(this.$el);
      const defaultZoom = 16;
      map.setCenter({ lat: 44.29160723928563, lng: centralLocation[1] });
      map.setZoom(defaultZoom);

      const markerClickHandler = (marker) => {
        map.setZoom(Math.min(map.getZoom() + 1), defaultZoom + 1);
        map.setCenter(marker.getPosition());
        this.sendMarker(marker.ID);
      };

      const mapClickHandler = () => {
        map.setZoom(Math.max(map.getZoom() - 1), defaultZoom - 1);
        map.setCenter({ lat: 44.29160723928563, lng: centralLocation[1] });
        this.$props.selectedSpace = '';
      };

      const markers = this.createMarkers(data, map, google, markerClickHandler);

      map.addListener(`click`, () => mapClickHandler());
      this.$root.$on('selected-new-category', () => {
        map.setZoom(Math.max(map.getZoom() - 1, defaultZoom - 1));
        this.updateMarkers(markers);
      });
    } catch (error) {
      console.error(error);
    }
  },

  methods: {
    sendMarker(marker) {
      console.log(marker);
      this.$props.selectedSpace = marker;
    },
    createMarkers(data, map, google, markerClickHandler) {
      const markers = data.map((location) => {
        const marker = new google.maps.Marker({ ...location, map });
        marker.addListener(`click`, () => markerClickHandler(marker));
        if (this.$props.categorySelected == marker.NAME)
          marker.setVisible(true);
        else marker.setVisible(false);
        return marker;
      });

      return markers;
    },
    updateMarkers(markers) {
      markers.forEach((marker) => {
        if (this.$props.categorySelected == marker.NAME)
          marker.setVisible(true);
        else marker.setVisible(false);
      });
    },
  },

  props: {
    selectedSpace: String,
    categorySelected: String,
  },

  data() {
    return {
      markers: [],
    };
  },
};
</script>
