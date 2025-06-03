import {getAllLocations} from "@/app/_db/location";
import {LocationsContent} from "@/app/(internal)/(dashboard_layout)/data-center/locations/content";

export default async function LocationsPage() {
  const locations = await getAllLocations();

  return (
      <LocationsContent locations={locations}/>
  );
}
