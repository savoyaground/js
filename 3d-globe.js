import { feature } from 'https://esm.sh/topojson-client@3';
import { geoContains } from 'https://esm.sh/d3-geo@3';

/* ==================================================
   3D DOTTED GLOBE
================================================== */

const globeEl = document.getElementById('globeViz');

if (globeEl) {
  let started = false;

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting || started) return;

      started = true;
      observer.disconnect();
      initGlobe();
    },
    {
      rootMargin: '200px',
    }
  );

  observer.observe(globeEl);
}

function initGlobe() {
  if (!globeEl) return;

  if (typeof window.Globe !== 'function') {
    console.error(
      'Globe.gl is not loaded. Load the Globe.gl library before partner-globe.js.'
    );
    return;
  }

  const DOT_COLOR = '#DD9058';
  const DOT_RADIUS = 0.1;
  const DOT_ALTITUDE = 0.0025;
  const LAT_STEP = 1.9;

  const BASE_LAT = 16;
  const BASE_LNG = -18;
  const BASE_ALTITUDE = 1.25;

  const POINTER_LNG_RANGE = 60;
  const CAMERA_LERP = 0.065;

  const globe = new window.Globe(globeEl)
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
    const width = globeEl.offsetWidth;
    const height = globeEl.offsetHeight;

    if (!width || !height) return;

    globe.width(width).height(height);
  }

  resizeGlobe();
  window.addEventListener('resize', resizeGlobe);

  const cameraTarget = {
    lat: BASE_LAT,
    lng: BASE_LNG,
    altitude: BASE_ALTITUDE,
  };

  const cameraCurrent = {
    ...cameraTarget,
  };

  globe.pointOfView(cameraCurrent, 0);

  window.addEventListener('pointermove', (event) => {
    const normalizedX = (event.clientX / window.innerWidth) * 2 - 1;

    cameraTarget.lng =
      BASE_LNG + normalizedX * POINTER_LNG_RANGE;

    cameraTarget.lat = BASE_LAT;
  });

  globeEl.addEventListener(
    'wheel',
    (event) => {
      cameraTarget.lng += event.deltaY * 0.04;
    },
    {
      passive: true,
    }
  );

  function longitudeStep(latitude, step) {
    const cosine = Math.cos((latitude * Math.PI) / 180);

    return step / Math.max(0.28, cosine);
  }

  function buildDots(land) {
    const dots = [];

    for (
      let latitude = -58;
      latitude <= 85;
      latitude += LAT_STEP
    ) {
      const longitudeStepSize = longitudeStep(
        latitude,
        LAT_STEP
      );

      for (
        let longitude = -180;
        longitude <= 180;
        longitude += longitudeStepSize
      ) {
        if (!geoContains(land, [longitude, latitude])) {
          continue;
        }

        dots.push({
          lat: latitude,
          lng: longitude,
          alt: DOT_ALTITUDE,
          color: DOT_COLOR,
          size: DOT_RADIUS,
        });
      }
    }

    return dots;
  }

  function animate() {
    requestAnimationFrame(animate);

    cameraCurrent.lat +=
      (cameraTarget.lat - cameraCurrent.lat) * CAMERA_LERP;

    cameraCurrent.lng +=
      (cameraTarget.lng - cameraCurrent.lng) * CAMERA_LERP;

    globe.pointOfView(cameraCurrent, 0);
  }

  fetch(
    'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json'
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `World atlas request failed: ${response.status}`
        );
      }

      return response.json();
    })
    .then((topology) => {
      const land = feature(
        topology,
        topology.objects.land
      );

      globe.pointsData(buildDots(land));
      animate();
    })
    .catch((error) => {
      console.error('Unable to initialize the globe:', error);
    });
}
