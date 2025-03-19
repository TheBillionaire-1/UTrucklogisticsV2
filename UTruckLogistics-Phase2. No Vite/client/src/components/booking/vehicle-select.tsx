import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const vehicles = [
  { value: "van-3.5", label: "3.5 Ton Van" },
  { value: "truck-7.5", label: "7.5 Ton Truck" },
  { value: "truck-18", label: "18 Wheeler Truck" },
];

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function VehicleSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a vehicle type" />
      </SelectTrigger>
      <SelectContent>
        {vehicles.map((vehicle) => (
          <SelectItem key={vehicle.value} value={vehicle.value}>
            {vehicle.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
