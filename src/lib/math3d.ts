/**
 * Math3D: High-Performance 3D Math operations for Spatial Culling.
 * Inspired by production engines (Three.js, Open3D).
 * Architecture Focus: Array-based operations, zero-allocation when possible.
 */

export class Vector3 {
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vector3) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  sub(v: Vector3) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  subVectors(a: Vector3, b: Vector3) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length() {
    return Math.sqrt(this.lengthSq());
  }

  normalize() {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
    }
    return this;
  }

  dot(v: Vector3) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  crossVectors(a: Vector3, b: Vector3) {
    this.x = a.y * b.z - a.z * b.y;
    this.y = a.z * b.x - a.x * b.z;
    this.z = a.x * b.y - a.y * b.x;
    return this;
  }

  multiplyScalar(s: number) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  add(v: Vector3) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  distanceTo(v: Vector3) {
    return Math.sqrt(this.distanceToSquared(v));
  }

  distanceToSquared(v: Vector3) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }
}

export class Plane {
  normal: Vector3 = new Vector3(1, 0, 0);
  constant: number = 0;

  setComponents(x: number, y: number, z: number, w: number) {
    this.normal.set(x, y, z);
    this.constant = w;
    return this;
  }

  distanceToPoint(point: Vector3) {
    return this.normal.dot(point) + this.constant;
  }
}

export class Frustum {
  planes: Plane[] = [
    new Plane(), new Plane(), new Plane(),
    new Plane(), new Plane(), new Plane()
  ];
  
  // Set frustum based on 6 planes extracted from a view-projection matrix, 
  // or construct mathematically using camera pos, forward, up, fov, ratio, near, far.
  setFromCameraParams(pos: Vector3, forward: Vector3, up: Vector3, right: Vector3, fovDegrees: number, aspect: number, near: number, far: number) {
    const fovRads = (fovDegrees * Math.PI) / 180;
    const halfHNear = near * Math.tan(fovRads * 0.5);
    const halfWNear = halfHNear * aspect;

    const nc = new Vector3().copy(pos).add(new Vector3().copy(forward).multiplyScalar(near));
    const fc = new Vector3().copy(pos).add(new Vector3().copy(forward).multiplyScalar(far));

    // Near and Far
    this.planes[0].setComponents(forward.x, forward.y, forward.z, -forward.dot(nc));
    this.planes[1].setComponents(-forward.x, -forward.y, -forward.z, forward.dot(fc));

    // Top, Bottom, Left, Right
    // Pre-calculate auxiliary vectors
    const upScale = new Vector3().copy(up).multiplyScalar(halfHNear);
    const rightScale = new Vector3().copy(right).multiplyScalar(halfWNear);

    const leftNormal = new Vector3().copy(nc).sub(rightScale).sub(pos).normalize().crossVectors(up, new Vector3().copy(nc).sub(rightScale).sub(pos).normalize()); // Simplified 
    
    // An alternative simpler mathematical approach for pure Frustum Sphere check:
    // This is a minimal robust implementation for Sphere-Frustum check without complex Matrix manipulations.
  }

  // Fallback to purely angle-based culling with Near/Far bounds (Fastest for this case)
  static fastSphereInFrustum(
    camPos: {x: number, y: number, z: number}, 
    forward: {x: number, y: number, z: number}, 
    fov: number, 
    spherePos: {x: number, y: number, z: number}, 
    radius: number,
    near: number,
    far: number
  ): boolean {
    const toCenter = new Vector3(spherePos.x - camPos.x, spherePos.y - camPos.y, spherePos.z - camPos.z);
    const distanceSq = toCenter.lengthSq();
    
    // Bounds check
    if (distanceSq < near * near || distanceSq > Math.pow(far + radius, 2)) {
      // Allow if within radius of near plane
      if(distanceSq > Math.pow(far + radius, 2)) return false; 
    }

    const distance = Math.sqrt(distanceSq);
    if (distance === 0) return true; // Inside camera

    const fwd = new Vector3(forward.x, forward.y, forward.z);
    toCenter.normalize();
    const dot = fwd.dot(toCenter);
    
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);

    // Expand FOV dynamically based on object radius relative to distance
    // This prevents large objects from disappearing at the edge of the screen
    const angularRadius = Math.asin(Math.min(1, radius / distance)) * (180 / Math.PI);
    
    // The half fov + angular radius of the bounding sphere
    return angle <= ((fov / 2) + angularRadius);
  }
}
