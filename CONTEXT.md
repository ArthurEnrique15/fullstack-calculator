# Context — Fullstack Calculator

Glossary of the domain language. Keep implementation details out of this file.

## Terms

### Operation
A single arithmetic action the backend can perform. The set is fixed:
`add`, `subtract`, `multiply`, `divide`, `power`, `sqrt`, `percentage`.

### Operand
A numeric input to an Operation. Named `a` (first) and `b` (second).

### Arity
How many Operands an Operation takes.
- **Binary** (needs `a` and `b`): add, subtract, multiply, divide, power, percentage.
- **Unary** (needs only `a`): sqrt.

### Power
Exponentiation. `power(a, b)` = a raised to the b.

### Percentage
Defined as **"a percent of b"**: `percentage(a, b)` = (a / 100) × b.
Example: `percentage(10, 200)` = 20.

### Validation Error
The request is malformed: unknown operation, missing required operand, non-numeric input, bad JSON. Client's fault. HTTP `400`.

### Math Error
The request is well-formed but the operation is undefined for those operands: division by zero, square root of a negative, or a result that is not a finite number (NaN / ±Infinity). HTTP `422`.

### Current Operand
On the frontend, the number currently shown on the calculator display. It is the running value of the calculation.

### Pending Operation
On the frontend, an Operation the user has chosen but not yet evaluated (waiting for the second Operand and `=`).

### Accumulator (interaction model)
The frontend calculation cycle: the Current Operand becomes the first Operand of the next Operation, so calculations can be chained (`+ 5 =` again) while the backend still only ever performs one binary Operation per request. See ADR 0002.

### Backend-authoritative
Every arithmetic result comes from the backend. The frontend never computes an arithmetic answer locally. Pressing `=` or a unary operator always issues an API call.
