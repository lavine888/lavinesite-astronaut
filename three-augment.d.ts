import "three";

declare module "three" {
  interface Vector3 {
    set(...args: number[]): this;
  }
}
