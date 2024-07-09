declare module "use-react-countries" {
  import "use-react-countries";
  import {Dispatch, SetStateAction} from "react";

  type Countries = Array<{
    name: string;
    capital: string;
    area: number;
    coordinates: [number, number];
    currencies: Array<{
      name: string;
      symbol: string;
    }>;
    languages: string[];
    maps: {
      googleMaps: string;
      openStreetMaps: string;
    };
    postalCode: {
      format: string;
      regex: string;
    };
    flags: {
      png: string;
      svg: string;
    };
    population: number;
    emoji: string;
    countryCallingCode: string;
  }>;

  export type useCountriesFunctionType = {
    countries: Countries;
    setCountries: Dispatch<SetStateAction<Countries>>
  }

  export function useCountries(): useCountriesFunctionType;
}
