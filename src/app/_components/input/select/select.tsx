import React, {useEffect, useState} from "react";
import AsyncSelect from "react-select/async";

export type SelectOption<T> = {
  value: T,
  label: string,
  [key: string]: any
}

export interface SelectProps<T> {
  setValue: (value?: T) => void;

  selectedData?: SelectOption<T>,
  data: SelectOption<T>[]

  filterFn?: (o: SelectOption<T>) => boolean

  placeholder: string
}

export function SelectComponent<T = string>(props: SelectProps<T>) {
  const [value, setValue] = useState<SelectOption<T> | undefined>(undefined);
  const [options, setOptions] = useState<SelectOption<T>[]>(props.data);

  const loadOptions = (
    inputValue: string,
    callback: (options: SelectOption<T>[]) => void
  ) => {
    console.log(options);
    if (inputValue.length <= 2) {
      callback(options);
      return;
    }

    let filtered = options?.filter(props.filterFn ?? ((o) => {
      if (typeof o.value == "string") {
        return o.value.toLowerCase() == inputValue.toLowerCase();
      } else {
        return o.value == parseInt(inputValue, 10);
      }
    }));

    callback(filtered);
  };

  useEffect(() => {
    if (props.selectedData) {
      setValue(props.selectedData);
    }
  }, [props.selectedData]);

  useEffect(() => {
    setOptions(props.data);
  }, [props.data]);

  return (
    <AsyncSelect
      onChange={(n: SelectOption<T> | null) => {
        setValue(n ?? undefined);
        props.setValue(n?.value ?? undefined);
      }}
      isClearable={true}
      cacheOptions
      defaultOptions={options}
      loadOptions={loadOptions}
      value={value}
      placeholder={props.placeholder}
    />
  );
}
