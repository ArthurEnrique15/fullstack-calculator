// Package calculator holds the pure arithmetic domain for the service.
//
// It knows nothing about HTTP or JSON. Each operation is one function; a
// dispatch table maps the wire-level operation string to the function.
// Errors are typed sentinel values the handler layer maps to HTTP status
// codes and error codes per docs/API-CONTRACT.md.
package calculator

import (
	"errors"
	"math"
	"strconv"
)

// Op is the wire-level operation identifier from the frozen API contract.
type Op string

const (
	OpAdd        Op = "add"
	OpSubtract   Op = "subtract"
	OpMultiply   Op = "multiply"
	OpDivide     Op = "divide"
	OpPower      Op = "power"
	OpSqrt       Op = "sqrt"
	OpPercentage Op = "percentage"
)

// Sentinel errors the handler layer switches on to build the response.
var (
	ErrUnknownOperation = errors.New("unknown operation")
	ErrDivisionByZero   = errors.New("cannot divide by zero")
	ErrNegativeSqrt     = errors.New("cannot take square root of a negative number")
	ErrNonFiniteResult  = errors.New("result is not a finite number")
)

// IsUnary reports whether the operation only reads operand a.
func (o Op) IsUnary() bool { return o == OpSqrt }

// IsKnown reports whether the operation is part of the frozen contract.
func (o Op) IsKnown() bool {
	switch o {
	case OpAdd, OpSubtract, OpMultiply, OpDivide, OpPower, OpSqrt, OpPercentage:
		return true
	}
	return false
}

func add(a, b float64) (float64, error)      { return a + b, nil }
func subtract(a, b float64) (float64, error) { return a - b, nil }
func multiply(a, b float64) (float64, error) { return a * b, nil }

func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return a / b, nil
}

func power(a, b float64) (float64, error) { return math.Pow(a, b), nil }

func sqrt(a, _ float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSqrt
	}
	return math.Sqrt(a), nil
}

func percentage(a, b float64) (float64, error) { return (a / 100) * b, nil }

var dispatch = map[Op]func(float64, float64) (float64, error){
	OpAdd:        add,
	OpSubtract:   subtract,
	OpMultiply:   multiply,
	OpDivide:     divide,
	OpPower:      power,
	OpSqrt:       sqrt,
	OpPercentage: percentage,
}

// Calculate runs op on (a, b) and returns the rounded, finite result.
// For unary ops (sqrt) the b operand is ignored.
func Calculate(op Op, a, b float64) (float64, error) {
	fn, ok := dispatch[op]
	if !ok {
		return 0, ErrUnknownOperation
	}
	raw, err := fn(a, b)
	if err != nil {
		return 0, err
	}
	if math.IsNaN(raw) || math.IsInf(raw, 0) {
		return 0, ErrNonFiniteResult
	}
	return round(raw), nil
}

// round strips binary-float noise by formatting to ~12 significant digits
// and parsing back. Chosen so 0.1 + 0.2 renders as 0.3.
func round(x float64) float64 {
	s := strconv.FormatFloat(x, 'g', 12, 64)
	v, _ := strconv.ParseFloat(s, 64)
	return v
}
