import { z } from "zod";

import { DistrictSchema } from "@/lib/schema";

export const DISTRICTS_GEOJSON_URL = "/geo/almaty-districts.geojson";

const PositionSchema = z.tuple([z.number(), z.number()]);
const RingSchema = z.array(PositionSchema).min(4);

const GeometrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Polygon"), coordinates: z.array(RingSchema).min(1) }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(z.array(RingSchema).min(1)).min(1),
  }),
]);

export const DistrictFeatureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.object({ district: DistrictSchema }),
  geometry: GeometrySchema,
});

export const DistrictsGeoJsonSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(DistrictFeatureSchema).min(1),
});

export type DistrictFeature = z.infer<typeof DistrictFeatureSchema>;
export type DistrictsGeoJson = z.infer<typeof DistrictsGeoJsonSchema>;
