var map = new AMap.Map("container", {
  viewMode: "3D",
  defaultCursor: "pointer",
  mapStyle: "amap://styles/whitesmoke",
  showBuildingBlock: true,
  expandZoomRange: true,
  zooms: [3, 20],
  pitch: 50,
  zoom: 15,
  center: [116.84655458822007, 38.3],
});

map.setFeatures(["road"]);

var object3Dlayer = new AMap.Object3DLayer();
map.add(object3Dlayer);

map.on("click", (e) => {
  const { pixel } = e;
  const px = new AMap.Pixel(pixel.x, pixel.y);
  const obj = map.getObject3DByContainerPos(px, [object3Dlayer], false) || {};
});

const updateMeshColor = (obj) => {
  const { object } = obj;
};

var getRgba = function (str) {
  var red = parseFloat(str.substr(0, 2), 16) / 255.0;
  var green = parseFloat(str.substr(2, 2), 16) / 255.0;
  var blue = parseFloat(str.substr(4, 2), 16) / 255.0;
  var alpha = 1;
  if (str.length >= 8) {
    alpha = parseFloat(str.substr(6, 2), 16) / 255.0;
  }
  return [red, green, blue, alpha];
};

const getMapPoint = ([a, b, c]) => {
  const { x, y } = map.lngLatToGeodeticCoord([a, b]);
  return [x, y, -c];
};

const vectorSubtract = (a, b) => {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
};

const vectorAdd = (a, b) => {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
};

const getDirectionAndNorm = (v) => {
  const [a, b, c] = v;
  const norm = Math.sqrt(a * a + b * b + c * c);
  return [[a / norm, b / norm, c / norm], norm];
};

const ensureAizNotZero = (v) => {
  let flag = 0;
  let minimun = Math.abs(v[0]);
  for (let i = 1; i < 3; i++) {
    if (Math.abs(v[i]) > minimun) {
      flag = i;
      minimun = Math.abs(v[i]);
    }
  }
  const temp = v[2];
  v[2] = v[flag];
  v[flag] = temp;
  return flag;
};

const getReverseVector = (v) => {
  return [-v[0], -v[1], -v[2]];
};

const vectorMultiplication = (a, v) => {
  return [a * v[0], a * v[1], a * v[2]];
};

const getPointFromVectorAndNorm = (p, v, n) => {
  const [dir, _] = getDirectionAndNorm(v);
  return vectorAdd(p, vectorMultiplication(n, dir));
};

const swapByFlag = (v, flag) => {
  let result = [...v];
  const temp = result[flag];
  result[flag] = result[2];
  result[2] = temp;
  return result;
};

const pushPointToList = (list, flag, o, dir, v, n) => {
  list.push(getPointFromVectorAndNorm(o, v, n));
  list.push(getPointFromVectorAndNorm(o, getReverseVector(v), n));
  const d = vectorAdd(o, dir);
  list.push(getPointFromVectorAndNorm(d, v, n));
  list.push(getPointFromVectorAndNorm(d, getReverseVector(v), n));
};

const renderSphere = (o, r, color) => {
  let sphere = new AMap.Object3D.Mesh();
  let { geometry } = sphere;
  const [x, y, z] = o;
  const top_point = 0;
  const bottom_point = 1;
  geometry.vertices.push(x, y, z + r);
  geometry.vertices.push(x, y, z - r);
  geometry.vertexColors.push.apply(geometry.vertexColors, color);
  geometry.vertexColors.push.apply(geometry.vertexColors, color);

  const factor = Math.sqrt(2) / 2;
  let index = 2;
  const gap = Math.PI / 8;
  for (let theta = Math.PI / 2; theta >= -Math.PI / 2; theta -= gap) {
    let dx = r * Math.cos(theta);
    let dy = r * Math.sin(theta);
    geometry.vertices.push(x + dx, y + dy, z);
    geometry.vertices.push(x - dx, y - dy, z);
    geometry.vertexColors.push.apply(geometry.vertexColors, color);
    geometry.vertexColors.push.apply(geometry.vertexColors, color);

    dx *= factor;
    dy *= factor;
    geometry.vertices.push(x + dx, y + dy, z + r * factor);
    geometry.vertices.push(x - dx, y - dy, z + r * factor);
    geometry.vertices.push(x + dx, y + dy, z - r * factor);
    geometry.vertices.push(x - dx, y - dy, z - r * factor);
    for (let i = 0; i < 4; i++) {
      geometry.vertexColors.push.apply(geometry.vertexColors, color);
    }
    if (index > 2) {
      geometry.faces.push(top_point, index + 2 - 6, index + 2);
      geometry.faces.push(top_point, index + 3 - 6, index + 3);
      geometry.faces.push(bottom_point, index + 4 - 6, index + 4);
      geometry.faces.push(bottom_point, index + 5 - 6, index + 5);

      geometry.faces.push(index + 2, index + 2 - 6, index);
      geometry.faces.push(index + 2 - 6, index - 6, index);
      geometry.faces.push(index + 3, index + 3 - 6, index + 1);
      geometry.faces.push(index + 3 - 6, index + 1 - 6, index + 1);

      geometry.faces.push(index + 4, index + 4 - 6, index);
      geometry.faces.push(index + 4 - 6, index - 6, index);
      geometry.faces.push(index + 5, index + 5 - 6, index + 1);
      geometry.faces.push(index + 5 - 6, index + 1 - 6, index + 1);
    }
    index += 6;
  }
  sphere.transparent = true;
  object3Dlayer.add(sphere);
};

const getCylinderPoint = (org, des, radius, color) => {
  let result = [];
  // renderSphere(org, radius + 1, color[0]);
  // renderSphere(des, radius + 4, color[1]);
  let cylinderDirection = vectorSubtract(des, org);
  let [direction, height] = getDirectionAndNorm(cylinderDirection);
  const flag = ensureAizNotZero(direction);
  const [x, y, z] = direction;
  // x = 0 point
  const firstVector = [0, 1, -(y / z)];
  pushPointToList(
    result,
    flag,
    org,
    cylinderDirection,
    swapByFlag(firstVector, flag),
    radius
  );
  const gap = Math.PI / 8;
  for (let theta = Math.PI / 2 - gap; theta > -Math.PI / 2; theta -= gap) {
    const vector = [1, Math.tan(theta), -(x + Math.tan(theta) * y) / z];
    pushPointToList(
      result,
      flag,
      org,
      cylinderDirection,
      swapByFlag(vector, flag),
      radius
    );
  }
  return result;
};

const renderPipe = (org, des, color, radius) => {
  const cylinderRenderPoint = getCylinderPoint(
    getMapPoint(org),
    getMapPoint(des),
    radius,
    color
  );
  renderSphere(getMapPoint(org), radius + 3, color[0]);
  renderSphere(getMapPoint(des), radius + 3, color[1]);

  let pipe = new AMap.Object3D.Mesh();
  let { geometry } = pipe;
  for (let i = 0; i < cylinderRenderPoint.length; i += 4) {
    for (let j = 0; j < 2; j++) {
      let [x, y, z] = cylinderRenderPoint[i + j];
      geometry.vertices.push(x, y, z);
      geometry.vertexColors.push.apply(geometry.vertexColors, color[0]);
    }
    for (let j = 2; j < 4; j++) {
      let [x, y, z] = cylinderRenderPoint[i + j];
      geometry.vertices.push(x, y, z);
      geometry.vertexColors.push.apply(geometry.vertexColors, color[1]);
    }
    if (i < 4) {
      continue;
    }
    //  0      1        2         3
    // org, reverse, top_org, top_revers
    geometry.faces.push(i, i - 4, i + 2);
    geometry.faces.push(i - 4, i + 2 - 4, i + 2);
    geometry.faces.push(i + 1, i + 1 - 4, i + 3);
    geometry.faces.push(i + 1 - 4, i + 3 - 4, i + 3);
  }
  const temp = cylinderRenderPoint.length - 4;
  geometry.faces.push(0, temp + 1, 2);
  geometry.faces.push(temp + 1, temp + 3, 2);
  geometry.faces.push(1, temp, 3);
  geometry.faces.push(temp, temp + 2, 3);

  pipe.transparent = true;
  object3Dlayer.add(pipe);
};

const normaliztion = (num) => {
  if (Number.isNaN(num)) {
    return 0;
  }
  return Math.min(1, Math.max(0, (num + 1) / 2));
};

test_data.content.forEach(function (item, index) {
  const setNode = JSON.parse(item.setNode);
  let { startNodePress: start, endNodePress: end } = item;

  let startNodePress = normaliztion(parseFloat(start));
  let endNodePress = normaliztion(parseFloat(end));
  const step = (endNodePress - startNodePress) / (setNode.length - 1);

  const heightScaleRate = 5000;

  for (let i = 1; i < setNode.length; i++) {
    const s = startNodePress + step * (i - 1);
    const e = startNodePress + step * i;

    renderPipe(
      setNode[i - 1].concat([s * heightScaleRate]),
      setNode[i].concat([e * heightScaleRate]),
      [
        [0, s, 1, 1],
        [0, e, 1, 1],
      ],
      60
    );
  }
});
