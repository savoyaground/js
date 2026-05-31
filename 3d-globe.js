<script type="module">
import { feature } from 'https://esm.sh/topojson-client@3';
import { geoContains } from 'https://esm.sh/d3-geo@3';

const globeEl = document.getElementById('globeViz');

let started = false;

const observer = new IntersectionObserver((entries) => {
  if (!entries[0].isIntersecting || started) return;
  started = true;
  initGlobe();
}, { rootMargin: '200px' });

observer.observe(globeEl);

function initGlobe() {
  const DOT_COLOR = '#DD9058';
  const DOT_RADIUS = 0.1;
  const DOT_ALTITUDE = 0.0025;
  const LAT_STEP = 1.9;

  const BASE_LAT = 16;
  const BASE_LNG = -18;
  const BASE_ALTITUDE = 1.25;

  const POINTER_LAT_RANGE = 0;
  const POINTER_LNG_RANGE = 60;
  const CAMERA_LERP = 0.065;

  const globe = new Globe(globeEl)
    .globeImageUrl(null)
    .bumpImageUrl(null)
    .backgroundImageUrl(null)
    .showGlobe(false)
    .showAtmosphere(false)
    .pointLat('lat')
    .pointLng('lng')
    .pointAltitude('alt')
    .pointColor('color')
    .pointRadius('size')
    .pointsMerge(true)
    .pointsData([])
    .width(globeEl.offsetWidth)
    .height(globeEl.offsetHeight);

  const controls = globe.controls();
  controls.enableRotate = false;
  controls.enableZoom = false;

  function resizeGlobe() {
    globe.width(globeEl.offsetWidth).height(globeEl.offsetHeight);
  }

  window.addEventListener('resize', resizeGlobe);
  resizeGlobe();

  const cameraTarget = { lat: BASE_LAT, lng: BASE_LNG, altitude: BASE_ALTITUDE };
  const cameraCurrent = { ...cameraTarget };

  globe.pointOfView(cameraCurrent, 0);

  window.addEventListener('pointermove', e => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    cameraTarget.lng = BASE_LNG + nx * POINTER_LNG_RANGE;
    cameraTarget.lat = BASE_LAT;
  });

  globeEl.addEventListener('wheel', e => {
    cameraTarget.lng += e.deltaY * 0.04;
  }, { passive: true });

  function longitudeStep(lat, step) {
    const cos = Math.cos(lat * Math.PI / 180);
    return step / Math.max(0.28, cos);
  }

  function buildDots(land) {
    const dots = [];

    for (let lat = -58; lat <= 85; lat += LAT_STEP) {
      const lngStep = longitudeStep(lat, LAT_STEP);

      for (let lng = -180; lng <= 180; lng += lngStep) {
        if (!geoContains(land, [lng, lat])) continue;

        dots.push({ lat, lng, alt: DOT_ALTITUDE, color: DOT_COLOR, size: DOT_RADIUS });
      }
    }

    return dots;
  }

  function animate() {
    requestAnimationFrame(animate);

    cameraCurrent.lat += (cameraTarget.lat - cameraCurrent.lat) * CAMERA_LERP;
    cameraCurrent.lng += (cameraTarget.lng - cameraCurrent.lng) * CAMERA_LERP;

    globe.pointOfView(cameraCurrent, 0);
  }

  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
    .then(res => res.json())
    .then(topology => {
      const land = feature(topology, topology.objects.land);
      globe.pointsData(buildDots(land));
      animate();
    });
}
</script>
<!-- END: 3d Globe -->
