export const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, allowDecimal: boolean = true) => {
    // Block "e", "+", "-"
    if (["e", "E", "+", "-"].includes(e.key)) {
        e.preventDefault();
    }
    // Block "." if decimal not allowed or if already present
    if (e.key === "." && (!allowDecimal || e.currentTarget.value.includes("."))) {
        e.preventDefault();
    }
};

export const handlePositiveInput = (fn: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (parseFloat(val) < 0) return; // Ignore negative
    fn(val);
};
