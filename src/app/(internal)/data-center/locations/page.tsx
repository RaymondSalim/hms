import {getAllLocations} from "@/app/_db/location";
import {LocationTable} from "@/app/(internal)/data-center/locations/components/table";
import styles from "./location.module.css";

export default async function LocationsPage() {
  const locations = await getAllLocations();

  return (
    <div className={styles.locationsPageContainer}>
      <LocationTable locations={locations}/>
    </div>
  );
}
