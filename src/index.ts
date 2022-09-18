import Map from "./map"
import pkg from "../package.json";
import MercatorCoordinate from "./utils/mercator-coordinate";

const version = pkg.version;

export {
  Map,
  MercatorCoordinate,
  version,
}