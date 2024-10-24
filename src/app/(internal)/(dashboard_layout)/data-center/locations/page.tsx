import {getAllLocations} from "@/app/_db/location";
import {LocationsContent} from "@/app/(internal)/(dashboard_layout)/data-center/locations/content";
import styles from "./location.module.css";

export default async function LocationsPage() {
  const locations = await getAllLocations();

  return (
    <div className={styles.locationsPageContainer}>
      <LocationsContent locations={locations}/>
    </div>
  );
}
