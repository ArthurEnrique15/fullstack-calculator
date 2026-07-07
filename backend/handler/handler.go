// Package handler exposes the HTTP surface for the calculator service.
//
// It parses and validates requests, calls the pure calculator package,
// and formats success and error JSON exactly per docs/API-CONTRACT.md.
// It does not perform arithmetic.
package handler

import (
	"encoding/json"
	"errors"
	"io"
	"math"
	"net/http"
	"strings"

	"github.com/fullstack-calculator/backend/calculator"
)

// Error codes from the frozen contract.
const (
	CodeInvalidJSON      = "INVALID_JSON"
	CodeUnknownOperation = "UNKNOWN_OPERATION"
	CodeMissingOperand   = "MISSING_OPERAND"
	CodeInvalidOperand   = "INVALID_OPERAND"
	CodeDivisionByZero   = "DIVISION_BY_ZERO"
	CodeNegativeSqrt     = "NEGATIVE_SQRT"
	CodeNonFiniteResult  = "NON_FINITE_RESULT"
)

// calcRequest is the parsed shape. json.RawMessage lets the parser
// distinguish "absent", "null", "non-number", and "valid number" for each
// operand so it can pick the right error code.
type calcRequest struct {
	Operation string          `json:"operation"`
	A         json.RawMessage `json:"a"`
	B         json.RawMessage `json:"b"`
}

type successResp struct {
	Result    float64          `json:"result"`
	Operation calculator.Op    `json:"operation"`
	A         float64          `json:"a"`
	B         *float64         `json:"b,omitempty"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorResp struct {
	Error errorBody `json:"error"`
}

// Calculate is the POST /api/v1/calculate handler.
func Calculate(w http.ResponseWriter, r *http.Request) {
	if !hasJSONContentType(r) {
		writeError(w, http.StatusBadRequest, CodeInvalidJSON, "content type must be application/json")
		return
	}

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<16))
	if err != nil {
		writeError(w, http.StatusBadRequest, CodeInvalidJSON, "could not read request body")
		return
	}

	var req calcRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, CodeInvalidJSON, "malformed JSON body")
		return
	}

	op := calculator.Op(req.Operation)
	if !op.IsKnown() {
		writeError(w, http.StatusBadRequest, CodeUnknownOperation, "unknown operation")
		return
	}

	a, err := parseOperand("a", req.A)
	if err != nil {
		writeOperandError(w, err)
		return
	}

	var b float64
	var haveB bool
	if len(req.B) > 0 && string(req.B) != "null" {
		v, err := parseOperand("b", req.B)
		if err != nil {
			writeOperandError(w, err)
			return
		}
		b = v
		haveB = true
	}

	if !op.IsUnary() && !haveB {
		writeError(w, http.StatusBadRequest, CodeMissingOperand, "operand b is required")
		return
	}

	result, err := calculator.Calculate(op, a, b)
	if err != nil {
		writeMathError(w, err)
		return
	}

	resp := successResp{
		Result:    result,
		Operation: op,
		A:         a,
	}
	if !op.IsUnary() {
		resp.B = &b
	}
	writeJSON(w, http.StatusOK, resp)
}

// Healthz is the GET /healthz handler.
func Healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// operandError signals which operand failed and how; the caller maps it to
// the wire error code.
type operandError struct {
	name    string
	missing bool
}

func (e *operandError) Error() string { return e.name }

func parseOperand(name string, raw json.RawMessage) (float64, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return 0, &operandError{name: name, missing: true}
	}
	dec := json.NewDecoder(strings.NewReader(string(raw)))
	dec.UseNumber()
	tok, _ := dec.Token() // raw came from a successful outer Unmarshal, so this cannot fail.
	num, ok := tok.(json.Number)
	if !ok {
		return 0, &operandError{name: name, missing: false}
	}
	v, err := num.Float64()
	if err != nil || math.IsNaN(v) || math.IsInf(v, 0) {
		return 0, &operandError{name: name, missing: false}
	}
	return v, nil
}

func writeOperandError(w http.ResponseWriter, err error) {
	var oe *operandError
	if !errors.As(err, &oe) {
		writeError(w, http.StatusBadRequest, CodeInvalidOperand, "invalid operand")
		return
	}
	if oe.missing {
		writeError(w, http.StatusBadRequest, CodeMissingOperand, "operand "+oe.name+" is required")
		return
	}
	writeError(w, http.StatusBadRequest, CodeInvalidOperand, "operand "+oe.name+" must be a number")
}

func writeMathError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, calculator.ErrDivisionByZero):
		writeError(w, http.StatusUnprocessableEntity, CodeDivisionByZero, "cannot divide by zero")
	case errors.Is(err, calculator.ErrNegativeSqrt):
		writeError(w, http.StatusUnprocessableEntity, CodeNegativeSqrt, "cannot take square root of a negative number")
	default: // calculator.ErrNonFiniteResult — the only other math error the calculator can return once the operation is known.
		writeError(w, http.StatusUnprocessableEntity, CodeNonFiniteResult, "result is not a finite number")
	}
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, errorResp{Error: errorBody{Code: code, Message: msg}})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func hasJSONContentType(r *http.Request) bool {
	ct := r.Header.Get("Content-Type")
	if ct == "" {
		return false
	}
	if i := strings.Index(ct, ";"); i >= 0 {
		ct = ct[:i]
	}
	return strings.EqualFold(strings.TrimSpace(ct), "application/json")
}
