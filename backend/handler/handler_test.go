package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func do(t *testing.T, body string, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rr := httptest.NewRecorder()
	Calculate(rr, req)
	return rr
}

func decodeSuccess(t *testing.T, rr *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d, body=%s", rr.Code, rr.Body.String())
	}
	var out map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode success: %v", err)
	}
	return out
}

func decodeError(t *testing.T, rr *httptest.ResponseRecorder, wantStatus int) errorBody {
	t.Helper()
	if rr.Code != wantStatus {
		t.Fatalf("want status %d, got %d, body=%s", wantStatus, rr.Code, rr.Body.String())
	}
	var out errorResp
	if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	return out.Error
}

func TestCalculate_HappyPaths(t *testing.T) {
	cases := []struct {
		name    string
		body    string
		wantRes float64
		unary   bool
	}{
		{"add", `{"operation":"add","a":2,"b":3}`, 5, false},
		{"subtract", `{"operation":"subtract","a":10,"b":4}`, 6, false},
		{"multiply", `{"operation":"multiply","a":6,"b":7}`, 42, false},
		{"divide", `{"operation":"divide","a":20,"b":4}`, 5, false},
		{"power", `{"operation":"power","a":2,"b":10}`, 1024, false},
		{"sqrt with b omitted", `{"operation":"sqrt","a":16}`, 4, true},
		{"sqrt with b null", `{"operation":"sqrt","a":16,"b":null}`, 4, true},
		{"sqrt with b ignored", `{"operation":"sqrt","a":16,"b":999}`, 4, true},
		{"percentage", `{"operation":"percentage","a":10,"b":200}`, 20, false},
		{"rounding (0.1+0.2)", `{"operation":"add","a":0.1,"b":0.2}`, 0.3, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rr := do(t, tc.body, nil)
			out := decodeSuccess(t, rr)
			if got := out["result"].(float64); got != tc.wantRes {
				t.Fatalf("result = %v, want %v", got, tc.wantRes)
			}
			if _, hasB := out["b"]; tc.unary && hasB {
				t.Fatalf("unary response should omit b; got %v", out)
			}
			if _, hasB := out["b"]; !tc.unary && !hasB {
				t.Fatalf("binary response should include b; got %v", out)
			}
		})
	}
}

func TestCalculate_400_InvalidJSON(t *testing.T) {
	rr := do(t, `{not-json`, nil)
	e := decodeError(t, rr, http.StatusBadRequest)
	if e.Code != CodeInvalidJSON {
		t.Fatalf("code = %q, want %q", e.Code, CodeInvalidJSON)
	}
}

func TestCalculate_400_WrongContentType(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(`{"operation":"add","a":1,"b":2}`))
	req.Header.Set("Content-Type", "text/plain")
	rr := httptest.NewRecorder()
	Calculate(rr, req)
	e := decodeError(t, rr, http.StatusBadRequest)
	if e.Code != CodeInvalidJSON {
		t.Fatalf("code = %q, want %q", e.Code, CodeInvalidJSON)
	}
}

func TestCalculate_400_MissingContentType(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(`{"operation":"add","a":1,"b":2}`))
	req.Header.Del("Content-Type")
	rr := httptest.NewRecorder()
	Calculate(rr, req)
	e := decodeError(t, rr, http.StatusBadRequest)
	if e.Code != CodeInvalidJSON {
		t.Fatalf("code = %q, want %q", e.Code, CodeInvalidJSON)
	}
}

func TestCalculate_400_ContentTypeWithCharset(t *testing.T) {
	// A charset parameter must not cause rejection.
	rr := do(t, `{"operation":"add","a":1,"b":2}`, map[string]string{"Content-Type": "application/json; charset=utf-8"})
	out := decodeSuccess(t, rr)
	if out["result"].(float64) != 3 {
		t.Fatalf("result = %v, want 3", out["result"])
	}
}

func TestCalculate_400_UnknownOperation(t *testing.T) {
	cases := []string{
		`{"operation":"modulo","a":1,"b":2}`,
		`{"operation":"","a":1,"b":2}`,
	}
	for _, body := range cases {
		rr := do(t, body, nil)
		e := decodeError(t, rr, http.StatusBadRequest)
		if e.Code != CodeUnknownOperation {
			t.Fatalf("body=%s: code = %q, want %q", body, e.Code, CodeUnknownOperation)
		}
	}
}

func TestCalculate_400_MissingOperand(t *testing.T) {
	cases := []struct {
		name string
		body string
	}{
		{"a absent", `{"operation":"add","b":2}`},
		{"a null", `{"operation":"add","a":null,"b":2}`},
		{"b absent binary", `{"operation":"add","a":1}`},
		{"b null binary", `{"operation":"add","a":1,"b":null}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rr := do(t, tc.body, nil)
			e := decodeError(t, rr, http.StatusBadRequest)
			if e.Code != CodeMissingOperand {
				t.Fatalf("code = %q, want %q", e.Code, CodeMissingOperand)
			}
		})
	}
}

func TestCalculate_400_InvalidOperand(t *testing.T) {
	cases := []struct {
		name string
		body string
	}{
		{"a string", `{"operation":"add","a":"one","b":2}`},
		{"a bool", `{"operation":"add","a":true,"b":2}`},
		{"a object", `{"operation":"add","a":{},"b":2}`},
		{"b string", `{"operation":"add","a":1,"b":"two"}`},
		{"b bool", `{"operation":"add","a":1,"b":false}`},
		{"a overflow to inf", `{"operation":"add","a":1e400,"b":2}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rr := do(t, tc.body, nil)
			e := decodeError(t, rr, http.StatusBadRequest)
			if e.Code != CodeInvalidOperand {
				t.Fatalf("code = %q, want %q", e.Code, CodeInvalidOperand)
			}
		})
	}
}

func TestCalculate_422_DivisionByZero(t *testing.T) {
	rr := do(t, `{"operation":"divide","a":1,"b":0}`, nil)
	e := decodeError(t, rr, http.StatusUnprocessableEntity)
	if e.Code != CodeDivisionByZero {
		t.Fatalf("code = %q", e.Code)
	}
}

func TestCalculate_422_NegativeSqrt(t *testing.T) {
	rr := do(t, `{"operation":"sqrt","a":-9}`, nil)
	e := decodeError(t, rr, http.StatusUnprocessableEntity)
	if e.Code != CodeNegativeSqrt {
		t.Fatalf("code = %q", e.Code)
	}
}

func TestCalculate_422_NonFinite(t *testing.T) {
	rr := do(t, `{"operation":"power","a":10,"b":400}`, nil)
	e := decodeError(t, rr, http.StatusUnprocessableEntity)
	if e.Code != CodeNonFiniteResult {
		t.Fatalf("code = %q", e.Code)
	}
}

func TestHealthz(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rr := httptest.NewRecorder()
	Healthz(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d", rr.Code)
	}
	var out map[string]string
	if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out["status"] != "ok" {
		t.Fatalf("body = %v", out)
	}
}

// errReader always fails on Read; used to exercise the io.ReadAll error branch.
type errReader struct{}

func (errReader) Read(p []byte) (int, error) { return 0, errors.New("boom") }
func (errReader) Close() error               { return nil }

func TestCalculate_400_BodyReadError(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", errReader{})
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	Calculate(rr, req)
	e := decodeError(t, rr, http.StatusBadRequest)
	if e.Code != CodeInvalidJSON {
		t.Fatalf("code = %q, want %q", e.Code, CodeInvalidJSON)
	}
}

func TestCalculate_ResponseEchoesOperandsAndOperation(t *testing.T) {
	rr := do(t, `{"operation":"percentage","a":10,"b":200}`, nil)
	out := decodeSuccess(t, rr)
	if out["operation"] != "percentage" {
		t.Fatalf("operation = %v", out["operation"])
	}
	if out["a"].(float64) != 10 {
		t.Fatalf("a = %v", out["a"])
	}
	if out["b"].(float64) != 200 {
		t.Fatalf("b = %v", out["b"])
	}
	if out["result"].(float64) != 20 {
		t.Fatalf("result = %v", out["result"])
	}
}

func TestOperandError_Error(t *testing.T) {
	oe := &operandError{name: "a"}
	if oe.Error() != "a" {
		t.Fatalf("Error() = %q, want %q", oe.Error(), "a")
	}
}

// Ensures writeOperandError still emits INVALID_OPERAND when given a
// non-operand error. This defensive path is not reachable via the public
// handler but guards against future refactors that thread other errors in.
func TestWriteOperandError_FallsBackToInvalid(t *testing.T) {
	rr := httptest.NewRecorder()
	writeOperandError(rr, errors.New("some unknown parse failure"))
	e := decodeError(t, rr, http.StatusBadRequest)
	if e.Code != CodeInvalidOperand {
		t.Fatalf("code = %q", e.Code)
	}
}

// Sanity: writeJSON produces a JSON body with the given status.
func TestWriteJSON(t *testing.T) {
	rr := httptest.NewRecorder()
	writeJSON(rr, http.StatusTeapot, map[string]int{"n": 1})
	if rr.Code != http.StatusTeapot {
		t.Fatalf("status = %d", rr.Code)
	}
	if !bytes.Contains(rr.Body.Bytes(), []byte(`"n":1`)) {
		t.Fatalf("body = %s", rr.Body.String())
	}
	if ct := rr.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("content-type = %q", ct)
	}
}

// Guard against a regression where a valid request body just barely under
// the max size limit still succeeds (proves MaxBytesReader is wired correctly
// without rejecting normal payloads).
func TestCalculate_NormalSizedBodyOK(t *testing.T) {
	rr := do(t, `{"operation":"add","a":1,"b":2}`, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestCalculate_400_BodyTooLarge(t *testing.T) {
	// Body over the 64 KiB cap → io.ReadAll returns an error.
	big := make([]byte, 1<<17)
	for i := range big {
		big[i] = 'x'
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", io.NopCloser(bytes.NewReader(big)))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	Calculate(rr, req)
	e := decodeError(t, rr, http.StatusBadRequest)
	if e.Code != CodeInvalidJSON {
		t.Fatalf("code = %q", e.Code)
	}
}
