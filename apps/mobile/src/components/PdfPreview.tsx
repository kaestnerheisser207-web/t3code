import { useTranslate } from "../i18n";
import { useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

import { FilePreviewLoading, FilePreviewNotice } from "../features/files/FilePreviewFeedback";
import { webViewDecelerationRate } from "../lib/webViewDecelerationRate";

export function PdfPreview(props: { readonly uri: string }) {
  const t = useTranslate();
  const [error, setError] = useState<string | null>(null);
  return (
    <View className="flex-1 bg-card">
      {error ? (
        <FilePreviewNotice title={t("mobile.common.PdfPreview.could-not-load-pdf")}>
          {error}
        </FilePreviewNotice>
      ) : null}
      <WebView
        source={{ uri: props.uri }}
        originWhitelist={["*"]}
        automaticallyAdjustContentInsets={false}
        decelerationRate={webViewDecelerationRate}
        contentInsetAdjustmentBehavior="never"
        startInLoadingState
        onError={(event) =>
          setError(event.nativeEvent.description || "The PDF could not be loaded.")
        }
        onHttpError={(event) =>
          setError(`The server returned HTTP ${event.nativeEvent.statusCode}.`)
        }
        renderLoading={() => (
          <FilePreviewLoading message={t("release4491.text041")} background="card" />
        )}
        style={{ flex: 1, backgroundColor: "transparent" }}
      />
    </View>
  );
}
