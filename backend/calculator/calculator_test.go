package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestCalculate_Success(t *testing.T) {
	cases := []struct {
		name string
		op   Op
		a, b float64
		want float64
	}{
		{"add", OpAdd, 2, 3, 5},
		{"add negatives", OpAdd, -2, -3, -5},
		{"subtract", OpSubtract, 10, 4, 6},
		{"subtract negative", OpSubtract, -1, -1, 0},
		{"multiply", OpMultiply, 6, 7, 42},
		{"multiply zero", OpMultiply, 0, 12345, 0},
		{"divide", OpDivide, 20, 4, 5},
		{"divide fraction", OpDivide, 1, 2, 0.5},
		{"power positive", OpPower, 2, 10, 1024},
		{"power zero exp", OpPower, 42, 0, 1},
		{"power negative exp", OpPower, 2, -1, 0.5},
		{"sqrt integer", OpSqrt, 16, 0, 4},
		{"sqrt zero", OpSqrt, 0, 0, 0},
		{"sqrt fractional", OpSqrt, 2, 0, 1.41421356237},
		{"percentage contract example", OpPercentage, 10, 200, 20},
		{"percentage negative", OpPercentage, -50, 200, -100},
		{"rounding strips float noise", OpAdd, 0.1, 0.2, 0.3},
		{"rounding subtraction noise", OpSubtract, 0.3, 0.1, 0.2},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Calculate(tc.op, tc.a, tc.b)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if math.Abs(got-tc.want) > 1e-9 {
				t.Fatalf("Calculate(%s,%v,%v) = %v, want %v", tc.op, tc.a, tc.b, got, tc.want)
			}
		})
	}
}

func TestCalculate_Errors(t *testing.T) {
	cases := []struct {
		name    string
		op      Op
		a, b    float64
		wantErr error
	}{
		{"unknown op", Op("bogus"), 1, 2, ErrUnknownOperation},
		{"divide by zero", OpDivide, 1, 0, ErrDivisionByZero},
		{"divide zero by zero", OpDivide, 0, 0, ErrDivisionByZero},
		{"sqrt of negative", OpSqrt, -4, 0, ErrNegativeSqrt},
		{"power overflow to +Inf", OpPower, 10, 400, ErrNonFiniteResult},
		{"power overflow to -Inf", OpPower, -10, 401, ErrNonFiniteResult},
		{"power NaN (neg base, frac exp)", OpPower, -2, 0.5, ErrNonFiniteResult},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Calculate(tc.op, tc.a, tc.b)
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("Calculate(%s,%v,%v) err = %v, want %v", tc.op, tc.a, tc.b, err, tc.wantErr)
			}
			if got != 0 {
				t.Fatalf("expected zero result on error, got %v", got)
			}
		})
	}
}

func TestOp_IsUnary(t *testing.T) {
	if !OpSqrt.IsUnary() {
		t.Fatal("sqrt must be unary")
	}
	for _, op := range []Op{OpAdd, OpSubtract, OpMultiply, OpDivide, OpPower, OpPercentage} {
		if op.IsUnary() {
			t.Fatalf("%s must not be unary", op)
		}
	}
}

func TestOp_IsKnown(t *testing.T) {
	for _, op := range []Op{OpAdd, OpSubtract, OpMultiply, OpDivide, OpPower, OpSqrt, OpPercentage} {
		if !op.IsKnown() {
			t.Fatalf("%s must be known", op)
		}
	}
	if Op("bogus").IsKnown() {
		t.Fatal("bogus must not be known")
	}
	if Op("").IsKnown() {
		t.Fatal("empty must not be known")
	}
}
