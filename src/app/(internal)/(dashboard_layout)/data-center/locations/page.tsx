import {getAllLocations} from "@/app/_db/location";
import {LocationsContent} from "@/app/(internal)/(dashboard_layout)/data-center/locations/content";

export default async function LocationsPage() {
  const locations = await getAllLocations(undefined, undefined, {
    _count: true
  });

  return (
      <LocationsContent
          // @ts-expect-error location type
          locations={locations}
      />
  );
}
